import "server-only";
import { semanticSearch, keywordSearch, type SectionHit } from "./vector";
import {
  reciprocalRankFusion,
  dedupeById,
  rerank,
  normalizeScores,
} from "./reranker";
import type { EvidencePack } from "@/lib/legal/schemas";
import { logger } from "@/lib/logger";

export interface RetrieveOptions {
  k?: number;
  metadataFilter?: {
    actName?: string;
    jurisdiction?: string;
  };
}

/**
 * Hybrid retrieval over the verified statutory database:
 *  semantic (pgvector) + keyword (Postgres FTS) → RRF → dedupe → rerank.
 */
export async function hybridRetrieve(
  query: string,
  options: RetrieveOptions = {}
): Promise<SectionHit[]> {
  const k = options.k ?? 8;
  const [semantic, keyword] = await Promise.all([
    semanticSearch(query, k),
    keywordSearch(query, k).catch((err) => {
      logger.warn("keyword_search_failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      return [] as SectionHit[];
    }),
  ]);

  let results = reciprocalRankFusion<SectionHit>([semantic, keyword], {
    weights: [0.7, 0.5],
  });
  results = dedupeById(results);
  results = rerank(results, query);
  results = normalizeScores(results);

  let filtered = results.map((r) => r.item);
  if (options.metadataFilter?.actName) {
    const act = options.metadataFilter.actName.toLowerCase();
    filtered = filtered.filter((s) => s.actName.toLowerCase().includes(act));
  }
  return filtered.slice(0, k);
}

/** Convert statutory section hits into a normalized evidence pack. */
export function sectionsToEvidencePack(
  query: string,
  hits: SectionHit[]
): EvidencePack {
  return {
    query,
    provider: "database",
    mode: "live",
    retrievedAt: new Date().toISOString(),
    sources: hits.map((h) => ({
      id: h.id,
      title: `${h.actName} — Section ${h.sectionNumber}${h.heading ? `: ${h.heading}` : ""}`,
      type: "section",
      authority: h.actName,
      excerpt: h.text.slice(0, 500),
      url: h.sourceUrl ?? undefined,
      relevanceScore: h.score,
    })),
  };
}

export type { SectionHit };
