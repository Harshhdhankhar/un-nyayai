import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { embed } from "@/lib/embedding";
import { logger } from "@/lib/logger";

export interface SectionHit {
  id: string;
  actName: string;
  sectionNumber: string;
  heading: string;
  text: string;
  sourceUrl: string | null;
  score: number;
}

/** pgvector cosine search over verified statutory sections. */
export async function semanticSearch(
  query: string,
  k = 8
): Promise<SectionHit[]> {
  const { vector } = await embed(query);
  const vecStr = `[${vector.join(",")}]`;
  const rows = (await db.execute(sql`
    SELECT id, act_name, section_number, heading, text, source_url,
       (1 - (embedding <=> ${vecStr}::vector)) AS score
    FROM sections
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${vecStr}::vector
    LIMIT ${k}
  `)) as Record<string, unknown>[];
  return (Array.isArray(rows) ? rows : []).map(normalizeHit);
}

/** PostgreSQL full-text search over verified statutory sections. */
export async function keywordSearch(
  query: string,
  k = 8
): Promise<SectionHit[]> {
  const rows = (await db.execute(sql`
    SELECT id, act_name, section_number, heading, text, source_url,
       ts_rank_cd(
         to_tsvector('english', coalesce(text,'') || ' ' || coalesce(heading,'') || ' ' || act_name),
         plainto_tsquery('english', ${query})
       ) AS score
    FROM sections
    WHERE to_tsvector('english', coalesce(text,'') || ' ' || coalesce(heading,'') || ' ' || act_name)
          @@ plainto_tsquery('english', ${query})
    ORDER BY score DESC
    LIMIT ${k}
  `)) as Record<string, unknown>[];
  return (Array.isArray(rows) ? rows : []).map(normalizeHit);
}

function normalizeHit(row: Record<string, unknown>): SectionHit {
  return {
    id: String(row.id),
    actName: String(row.act_name ?? ""),
    sectionNumber: String(row.section_number ?? ""),
    heading: String(row.heading ?? ""),
    text: String(row.text ?? ""),
    sourceUrl: row.source_url ? String(row.source_url) : null,
    score: Number(row.score ?? 0),
  };
}

/** Embed all verified sections that lack embeddings (used by seeding script). */
export async function embedMissingSections() {
  const rows = (await db.execute(sql`
    SELECT id, text FROM sections WHERE embedding IS NULL
  `)) as Record<string, unknown>[];
  for (const row of Array.isArray(rows) ? rows : []) {
    const { vector } = await embed(String(row.text));
    const vecStr = `[${vector.join(",")}]`;
    await db.execute(sql`
      UPDATE sections SET embedding = ${vecStr}::vector WHERE id = ${row.id}
    `);
  }
  logger.info("embedded_sections", { count: Array.isArray(rows) ? rows.length : 0 });
}
