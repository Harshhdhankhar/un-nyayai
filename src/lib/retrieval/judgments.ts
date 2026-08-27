import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { embed } from "@/lib/embedding";
import { logger } from "@/lib/logger";

export interface JudgmentHit {
  id: string;
  title: string;
  court: string | null;
  citation: string | null;
  decisionDate: string | null;
  summary: string | null;
  sourceUrl: string | null;
  provenance: string;
  score: number;
}

/**
 * RAG retrieval over the verified case-law table.
 * Semantic (pgvector) channel fused with a Postgres FTS channel via RRF,
 * so both paraphrased questions and exact citations are found.
 */
export async function retrieveJudgments(
  queries: string[],
  k = 3
): Promise<JudgmentHit[]> {
  const unique = queries.map((q) => q.trim()).filter(Boolean).slice(0, 4);
  if (unique.length === 0) return [];

  const vectorQueries: (string | null)[] = await Promise.all(
    unique.map(async (q) => {
      try {
        const { vector } = await embed(q);
        return `[${vector.join(",")}]`;
      } catch (err) {
        logger.warn("judgment_embed_failed", {
          error: err instanceof Error ? err.message : String(err),
        });
        return null;
      }
    })
  );

  const channels = await Promise.all(
    unique.map((q, i) =>
      Promise.all([
        vectorChannel(vectorQueries[i], k),
        ftsChannel(q, k).catch(() => [] as JudgmentHit[]),
      ])
    )
  );

  const lists = channels.flat().filter((l) => l.length > 0);
  if (lists.length === 0) return [];

  // RRF fusion without importing the document reranker (keeps this module
  // independent); simple reciprocal-rank scoring over all lists.
  const scores = new Map<string, { hit: JudgmentHit; score: number }>();
  for (const list of lists) {
    list.forEach((hit, rank) => {
      const entry = scores.get(hit.id);
      const contribution = 1 / (60 + rank + 1);
      if (entry) entry.score += contribution;
      else scores.set(hit.id, { hit, score: contribution });
    });
  }

  const max = Math.max(...[...scores.values()].map((s) => s.score));
  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ hit, score }) => ({ ...hit, score: score / (max || 1) }));
}

async function vectorChannel(
  vectorQuery: string | null,
  k: number
): Promise<JudgmentHit[]> {
  if (!vectorQuery) return [];
  try {
    const rows = await db.execute(sql`
      SELECT id, title, court, citation, decision_date, summary, source_url, provenance,
        (1 - (embedding <=> ${vectorQuery}::vector)) AS score
      FROM judgments
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${vectorQuery}::vector
      LIMIT ${k}
    `);
    return mapRows(rows as Record<string, unknown>[]);
  } catch (err) {
    logger.warn("judgment_vector_search_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

async function ftsChannel(query: string, k: number): Promise<JudgmentHit[]> {
  const rows = await db.execute(sql`
    SELECT id, title, court, citation, decision_date, summary, source_url, provenance,
      ts_rank_cd(
        to_tsvector('english', coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(citation,'')),
        plainto_tsquery('english', ${query})
      ) AS score
    FROM judgments
    WHERE to_tsvector('english', coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(citation,''))
          @@ plainto_tsquery('english', ${query})
    ORDER BY score DESC
    LIMIT ${k}
  `);
  return mapRows(rows as Record<string, unknown>[]);
}

function mapRows(rows: Record<string, unknown>[]): JudgmentHit[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    id: String(row.id),
    title: String(row.title ?? ""),
    court: row.court ? String(row.court) : null,
    citation: row.citation ? String(row.citation) : null,
    decisionDate: row.decision_date ? String(row.decision_date) : null,
    summary: row.summary ? String(row.summary) : null,
    sourceUrl: row.source_url ? String(row.source_url) : null,
    provenance: String(row.provenance ?? "manual"),
    score: Number(row.score ?? 0),
  }));
}

/** Convert judgment hits into evidence-pack source items. */
export function judgmentsToSources(hits: JudgmentHit[]) {
  return hits.map((h) => ({
    id: `j-${h.id}`,
    title: `${h.provenance === "demo" ? "DEMO DATA — " : ""}${h.title}`,
    type: "judgment",
    authority: h.court ?? undefined,
    date: h.decisionDate ?? undefined,
    citation: h.citation ?? undefined,
    excerpt: h.summary?.slice(0, 600),
    url: h.sourceUrl ?? undefined,
    relevanceScore: h.score,
  }));
}
