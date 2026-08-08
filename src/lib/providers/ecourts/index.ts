import "server-only";
import {
  lookupByCnrLive,
  searchCasesLive,
  refreshCaseLive,
  fetchEnumsLive,
  checkEcourtsHealth,
} from "./client";
import { mockLookupByCnr } from "./mock";
import { mapCaseDetail, mapCaseToSummary, mapSearchRow } from "./mapper";
import type { ECourtCaseDetail, ECourtSearchResponse } from "./types";
import { logger } from "@/lib/logger";

/* =========================================================================
 * eCourts facade. Attempts a live lookup; on failure returns DEMO data
 * (clearly flagged) so demo scenarios always work. Search and refresh are
 * live-only and never fabricate results.
 * ========================================================================= */

export interface CaseLookupOutput {
  caseData: ECourtCaseDetail;
  mode: "live" | "demo";
}

export async function lookupCaseByCnr(cnr: string): Promise<CaseLookupOutput> {
  const normalized = cnr.trim().toUpperCase();
  if (!/^[A-Z0-9-]+$/.test(normalized)) {
    throw new Error("Invalid CNR format.");
  }
  try {
    const raw = await lookupByCnrLive(normalized);
    return { caseData: mapCaseDetail(raw), mode: "live" };
  } catch (err) {
    logger.warn("ecourts_fallback_demo", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { caseData: mockLookupByCnr(normalized), mode: "demo" };
  }
}

export interface SearchOutput {
  results: ECourtSearchResponse;
  mode: "live" | "demo";
}

export async function searchCases(params: {
  query?: string;
  courtCodes?: string;
  caseTypes?: string;
  filingYears?: string;
  litigants?: string;
  page?: number;
}): Promise<SearchOutput> {
  try {
    const data = await searchCasesLive(params);
    const results = {
      ...data,
      results: data.results.map(mapSearchRow),
    };
    return { results, mode: "live" };
  } catch (err) {
    logger.warn("ecourts_search_demo", {
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      results: { results: [], totalHits: 0, page: 1, hasNextPage: false },
      mode: "demo",
    };
  }
}

export async function refreshCase(cnr: string): Promise<{ ok: boolean; mode: "live" | "demo" }> {
  try {
    const ok = await refreshCaseLive(cnr);
    return { ok, mode: "live" };
  } catch (err) {
    logger.warn("ecourts_refresh_demo", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, mode: "demo" };
  }
}

export { mapCaseToSummary, checkEcourtsHealth, fetchEnumsLive };
