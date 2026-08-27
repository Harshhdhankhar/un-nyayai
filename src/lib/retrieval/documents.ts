import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { embed } from "@/lib/embedding";
import { logger } from "@/lib/logger";
import { reciprocalRankFusion, dedupeById, normalizeScores, type RankedDoc } from "./reranker";

export interface DocumentChunkHit {
  id: string;
  documentId: string;
  documentName: string;
  kind: string;
  content: string;
  chunkIndex: number;
  page: number | null;
  score: number;
}

export interface DocumentRetrieveOptions {
  userId: string;
  matterId?: string;
  /** Restrict retrieval to a single document (document chat). */
  documentId?: string;
  k?: number;
}

/**
 * RAG retrieval over the user's uploaded matter documents.
 * True hybrid: pgvector semantic channel + Postgres FTS channel per query,
 * all ranked lists fused with RRF, scoped to the current user/matter.
 */
export async function retrieveDocumentChunks(
  query: string | string[],
  options: DocumentRetrieveOptions
): Promise<DocumentChunkHit[]> {
  const queries = (Array.isArray(query) ? query : [query])
    .map((q) => q.trim())
    .filter(Boolean)
    .slice(0, 4);
  if (queries.length === 0) return [];
  const k = options.k ?? 6;
  const { userId, matterId } = options;

  // One shared embedding call per distinct query for the semantic channels.
  const vectorQueries: (string | null)[] = await Promise.all(
    queries.map(async (q) => {
      try {
        const { vector } = await embed(q);
        return `[${vector.join(",")}]`;
      } catch (err) {
        logger.warn("doc_embed_failed", {
          error: err instanceof Error ? err.message : String(err),
        });
        return null;
      }
    })
  );

  const scope = options.documentId
    ? sql`d.user_id = ${userId} AND d.id = ${options.documentId}`
    : matterId
      ? sql`d.user_id = ${userId} AND d.matter_id = ${matterId}`
      : sql`d.user_id = ${userId}`;

  // Run every channel in parallel: semantic + keyword per query.
  const channels = await Promise.all(
    queries.map((q, i) =>
      Promise.all([
        vectorChannel(vectorQueries[i], scope, k),
        ftsChannel(q, scope, k),
      ])
    )
  );

  const lists = channels.flat();
  let fused: RankedDoc<DocumentChunkHit>[] =
    reciprocalRankFusion<DocumentChunkHit>(lists, {
      weights: lists.map((_, i) => (i % 2 === 0 ? 0.7 : 0.5)),
    });
  fused = dedupeById(fused);
  fused = normalizeScores(fused);

  return fused.slice(0, k).map((r) => ({ ...r.item, score: r.score }));
}

/** Semantic (pgvector) channel — empty list when no embedding available. */
async function vectorChannel(
  vectorQuery: string | null,
  scope: ReturnType<typeof sql>,
  k: number
): Promise<DocumentChunkHit[]> {
  if (!vectorQuery) return [];
  const qv = sql`${vectorQuery}::vector`;
  try {
    const rows = await db.execute(sql`
      SELECT
        c.id, c.document_id, c.content, c.chunk_index, c.page,
        d.name AS document_name, d.kind,
        1 - (c.embedding <=> ${qv}) AS score
      FROM document_chunks c
      JOIN documents d ON d.id = c.document_id
      WHERE ${scope}
        AND c.embedding IS NOT NULL
      ORDER BY c.embedding <=> ${qv}
      LIMIT ${k}
    `);
    return mapChunkRows(rows as Record<string, unknown>[]);
  } catch (err) {
    logger.warn("doc_vector_search_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/** Keyword (Postgres FTS) channel — backed by the GIN index. */
async function ftsChannel(
  query: string,
  scope: ReturnType<typeof sql>,
  k: number
): Promise<DocumentChunkHit[]> {
  try {
    const rows = await db.execute(sql`
      SELECT
        c.id, c.document_id, c.content, c.chunk_index, c.page,
        d.name AS document_name, d.kind,
        ts_rank_cd(
          to_tsvector('english', coalesce(c.content,'')),
          plainto_tsquery('english', ${query})
        ) AS score
      FROM document_chunks c
      JOIN documents d ON d.id = c.document_id
      WHERE ${scope}
        AND to_tsvector('english', coalesce(c.content,''))
            @@ plainto_tsquery('english', ${query})
      ORDER BY score DESC, c.created_at DESC
      LIMIT ${k}
    `);
    return mapChunkRows(rows as Record<string, unknown>[]);
  } catch (err) {
    logger.warn("doc_fts_search_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

function mapChunkRows(rows: Record<string, unknown>[]): DocumentChunkHit[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    id: String(row.id),
    documentId: String(row.document_id),
    documentName: String(row.document_name ?? "Document"),
    kind: String(row.kind ?? "other"),
    content: String(row.content ?? ""),
    chunkIndex: Number(row.chunk_index ?? 0),
    page: row.page != null ? Number(row.page) : null,
    score: Number(row.score ?? 0),
  }));
}

/** Convert document chunk hits into evidence-pack source items. */
export function chunksToSources(
  hits: DocumentChunkHit[],
  baseUrl?: string
) {
  return hits.map((h) => ({
    id: `doc-${h.id}`,
    title: h.documentName,
    type: "document",
    authority: h.kind,
    citation: h.page != null ? `Page ${h.page}` : undefined,
    excerpt: h.content.slice(0, 600),
    url: baseUrl,
    relevanceScore: h.score,
  }));
}
