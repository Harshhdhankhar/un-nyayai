-- RAG upgrade: ANN vector indexes + full-text search indexes.
-- Applied by drizzle-kit migrate; safe to re-run (IF NOT EXISTS).

-- HNSW (cosine) indexes for fast approximate nearest-neighbour search.
CREATE INDEX IF NOT EXISTS sections_embedding_hnsw_idx
  ON "sections" USING hnsw ("embedding" vector_cosine_ops);

CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx
  ON "document_chunks" USING hnsw ("embedding" vector_cosine_ops);

-- GIN indexes for keyword (Postgres FTS) channels.
-- Expressions must match the exact expressions used in retrieval queries.
CREATE INDEX IF NOT EXISTS sections_fts_idx
  ON "sections" USING gin (
    to_tsvector('english', coalesce(text,'') || ' ' || coalesce(heading,'') || ' ' || act_name)
  );

CREATE INDEX IF NOT EXISTS document_chunks_fts_idx
  ON "document_chunks" USING gin (to_tsvector('english', coalesce(content,'')));
