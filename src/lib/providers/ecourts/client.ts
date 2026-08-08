import "server-only";
import { config, hasEcourts } from "@/lib/config";
import { logger } from "@/lib/logger";
import type { ECourtSearchResponse } from "./types";

export class EcourtsUnavailableError extends Error {
  constructor() {
    super("eCourts API not configured.");
    this.name = "EcourtsUnavailableError";
  }
}

/* =========================================================================
 * Verified eCourtsIndia API client.
 *
 * Contract confirmed against the live API (see provider capability matrix):
 *   - Auth:      Authorization: Bearer eci_live_<token>
 *   - Envelope:  { data, meta }
 *   - Endpoints (GET unless noted):
 *       /api/partner/case/{cnr}                          full case record
 *       /api/partner/search                              full-text + facets
 *       /api/partner/enums?types=...                     code dictionaries
 *       /api/partner/case/{cnr}/refresh (POST)           async refresh
 *       /api/partner/case/bulk-refresh (POST)            up to 50 CNRs
 *       /api/partner/causelist/court-structure/states    court hierarchy
 *
 * Search facets: CourtCodes, CaseTypes, FilingYears, Litigants,
 * Petitioners, Respondents, Advocates, Judges, Query, Page, PageSize.
 * High Court keys need a bench suffix (e.g. DLHC01). Pagination is 1-based.
 * ========================================================================= */

async function ecourtsFetch(
  path: string,
  query: Record<string, string> = {}
): Promise<Response> {
  if (!hasEcourts) throw new EcourtsUnavailableError();
  const url = new URL(`${config.ecourts.baseUrl}${path}`);
  for (const [k, v] of Object.entries(query)) {
    if (v) url.searchParams.set(k, v);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.ecourts.timeoutMs);
  try {
    return await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.ecourts.apiKey}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function ecourtsJson<T>(
  path: string,
  query: Record<string, string> = {}
): Promise<T> {
  const res = await ecourtsFetch(path, query);
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    logger.warn("ecourts_http", {
      path,
      status: res.status,
      detail: detail.slice(0, 300),
    });
    throw new Error(`eCourts request failed (${res.status}).`);
  }
  const body = (await res.json()) as { data?: T; error?: unknown };
  if (body.error) {
    throw new Error(
      `eCourts error: ${JSON.stringify(body.error).slice(0, 300)}`
    );
  }
  return (body.data ?? body) as T;
}

/** Fetch the complete case record for a CNR. */
export async function lookupByCnrLive(cnr: string): Promise<unknown> {
  return ecourtsJson(`/api/partner/case/${encodeURIComponent(cnr)}`);
}

/** Full-text search with optional facets (court, case type, year, party). */
export async function searchCasesLive(params: {
  query?: string;
  courtCodes?: string;
  caseTypes?: string;
  filingYears?: string;
  litigants?: string;
  page?: number;
  pageSize?: number;
}): Promise<ECourtSearchResponse> {
  const data = (await ecourtsJson("/api/partner/search", {
    Query: params.query ?? "",
    CourtCodes: params.courtCodes ?? "",
    CaseTypes: params.caseTypes ?? "",
    FilingYears: params.filingYears ?? "",
    Litigants: params.litigants ?? "",
    Page: String(params.page ?? 1),
    PageSize: String(params.pageSize ?? 20),
  })) as {
    results: unknown[];
    totalHits: number;
    page: number;
    hasNextPage: boolean;
  };
  return {
    results: data.results as ECourtSearchResponse["results"],
    totalHits: data.totalHits ?? 0,
    page: data.page ?? 1,
    hasNextPage: data.hasNextPage ?? false,
  };
}

/** Fetch code dictionaries (caseType, caseStatus, courtCode, stateCode). */
export async function fetchEnumsLive(): Promise<Record<string, unknown>> {
  return ecourtsJson("/api/partner/enums", {
    types: "caseType,caseStatus,courtCode,stateCode",
  });
}

/** Queue an async refresh of a CNR from the official eCourts source. */
export async function refreshCaseLive(cnr: string): Promise<boolean> {
  const res = await ecourtsFetch(`/api/partner/case/${encodeURIComponent(cnr)}/refresh`);
  if (!res.ok) {
    logger.warn("ecourts_refresh", { cnr: cnr.slice(0, 6) + "…", status: res.status });
    return false;
  }
  return true;
}

export async function checkEcourtsHealth() {
  if (!hasEcourts) {
    return { ok: false, mode: "unconfigured", checkedAt: new Date().toISOString() };
  }
  try {
    const res = await ecourtsFetch("/api/partner/causelist/court-structure/states");
    return {
      ok: res.ok,
      mode: res.ok ? ("live" as const) : ("mock" as const),
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return { ok: false, mode: "mock", checkedAt: new Date().toISOString() };
  }
}

export { config };
