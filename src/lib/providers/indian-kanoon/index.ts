import "server-only";
import {
  searchKanoon,
  getKanoonDoc,
  getKanoonMeta,
  getKanoonFragments,
  getKanoonOrigDoc,
  checkKanoonHealth,
} from "./client";
import { mockSearch, mockDoc } from "./mock";
import { mapSearchDoc, mapDocResponse, extractCourt } from "./mapper";
import { buildKanoonQuery } from "./query";
import type { KanoonFilter, KanoonSearchResult } from "./types";
import { logger } from "@/lib/logger";
import { hasIndianKanoon } from "@/lib/config";
import { classifyProviderError } from "@/lib/providers/result";
import type { ProviderFailure } from "@/lib/providers/result";

/* =========================================================================
 * Indian Kanoon search/document facade with graceful degradation.
 * When the live API is unavailable, returns clearly-labelled mock results
 * ONLY when the provider is not configured. When it IS configured but fails
 * (timeout/auth/rate-limit), it returns no fabricated results plus a failure
 * signal, so the UI can say "could not refresh" instead of showing made-up
 * judgments.
 * ========================================================================= */

export interface KanoonSearchOutput {
  results: KanoonSearchResult[];
  mode: "live" | "mock";
  failure?: ProviderFailure;
}

export async function search(
  q: string,
  filter: KanoonFilter | number = {}
): Promise<KanoonSearchOutput> {
  const opts = typeof filter === "number" ? { pagenum: filter } : filter;
  try {
    const data = await searchKanoon(q, opts);
    const results = (data.docs ?? []).map(mapSearchDoc);
    if (results.length === 0) {
      logger.info("kanoon_empty", { q, page: opts.pagenum });
      return { results: [], mode: "live" };
    }
    return { results, mode: "live" };
  } catch (err) {
    logger.warn("kanoon_search_fallback", {
      error: err instanceof Error ? err.message : String(err),
      q,
    });
    if (!hasIndianKanoon) {
      return { results: mockSearch(q), mode: "mock" };
    }
    return { results: [], mode: "live", failure: classifyProviderError(err, { configured: true }) };
  }
}

/**
 * Natural-language research search. Structures the query (court token, date
 * range, stripped fillers) then runs the provider. Falls back to a plain
 * search of the raw query when structuring yields nothing usable.
 */
export async function searchStructured(natural: string, page = 0): Promise<KanoonSearchOutput> {
  const structured = buildKanoonQuery(natural);
  const q = structured.query || cleanRaw(natural);
  return search(q, { ...structured.filter, pagenum: page });
}

export async function fetchDocument(tid: number) {
  try {
    const doc = await getKanoonDoc(tid);
    const meta = await getKanoonMeta(tid).catch(() => null);
    return { doc: mapDocResponse(doc, meta), mode: "live" as const };
  } catch (err) {
    logger.warn("kanoon_doc_fallback", {
      error: err instanceof Error ? err.message : String(err),
      tid,
    });
    const mock = mockDoc(tid);
    if (!mock) return null;
    return { doc: mapDocResponse(mock, null), mode: "mock" as const };
  }
}

export async function fetchFragments(tid: number, query: string) {
  try {
    const res = await getKanoonFragments(tid, query);
    const fragments = (res.headline ?? []).map(cleanFragment).filter(Boolean);
    return { fragments, mode: "live" as const };
  } catch (err) {
    logger.warn("kanoon_fragments_fallback", {
      error: err instanceof Error ? err.message : String(err),
      tid,
    });
    return { fragments: [], mode: "mock" as const };
  }
}

export async function fetchCourtCopy(tid: number) {
  try {
    const res = await getKanoonOrigDoc(tid);
    return { doc: res.doc ?? "", mode: "live" as const };
  } catch (err) {
    logger.warn("kanoon_origdoc_fallback", {
      error: err instanceof Error ? err.message : String(err),
      tid,
    });
    return { doc: "", mode: "mock" as const };
  }
}

function cleanFragment(fragment: string): string {
  return fragment
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanRaw(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function toSourceItem(result: KanoonSearchResult, relevanceScore = 1) {
  return {
    id: `ik-${result.tid}`,
    title: result.title,
    type: "judgment" as const,
    authority: extractCourt(result.source, result.title),
    date: result.date,
    citation: result.citation,
    excerpt: result.excerpt,
    url: `https://indiankanoon.org/doc/${result.tid}/`,
    relevanceScore,
  };
}

export { checkKanoonHealth };