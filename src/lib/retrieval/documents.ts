import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { embed } from "@/lib/embedding";
import { logger } from "@/lib/logger";

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
  k?: number;
}

/**
 * RAG retrieval over the user's uploaded matter documents.
 * Searches document_chunks (pgvector embeddings) scoped to the current
 * user/matter. Falls back to full-text matching when no embedding exists.
 */
export async function retrieveDocumentChunks(
  query: string,
  options: DocumentRetrieveOptions
): Promise<DocumentChunkHit[]> {
  const k = options.k ?? 6;
  const { userId, matterId } = options;

  let vectorQuery: string | null = null;
  try {
    const { vector } = await embed(query);
    vectorQuery = `[${vector.join(",")}]`;
  } catch (err) {
    logger.warn("doc_embed_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const scope = matterId
    ? sql`d.user_id = ${userId} AND d.matter_id = ${matterId}`
    : sql`d.user_id = ${userId}`;

  const qv = vectorQuery ? sql`${vectorQuery}::vector` : sql`NULL::vector`;

  const rows = await db.execute(sql`
    SELECT
      c.id, c.document_id, c.content, c.chunk_index, c.page,
      d.name AS document_name, d.kind,
      CASE
        WHEN c.embedding IS NOT NULL THEN
          1 - (c.embedding <=> ${qv})
        ELSE 0
      END AS score
    FROM document_chunks c
    JOIN documents d ON d.id = c.document_id
    WHERE ${scope}
      AND (
        c.embedding IS NOT NULL
        OR to_tsvector('english', coalesce(c.content,'')) @@ plainto_tsquery('english', ${query})
      )
    ORDER BY score DESC, c.created_at DESC
    LIMIT ${k}
  `);

  const hits = (rows as Record<string, unknown>[]) ?? [];
  if (!Array.isArray(rows)) return [];
  if (hits.length === 0) {
    return [];
  }
  return hits
    .map((row) => ({
      id: String(row.id),
      documentId: String(row.document_id),
      documentName: String(row.document_name ?? "Document"),
      kind: String(row.kind ?? "other"),
      content: String(row.content ?? ""),
      chunkIndex: Number(row.chunk_index ?? 0),
      page: row.page != null ? Number(row.page) : null,
      score: Number(row.score ?? 0),
    }))
    .filter((h) => h.score > 0 || h.content.length > 0);
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
    excerpt: h.content.slice(0, 600),
    url: baseUrl,
    relevanceScore: h.score,
  }));
}
