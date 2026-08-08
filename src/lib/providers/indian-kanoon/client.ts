import "server-only";
import { config, hasIndianKanoon } from "@/lib/config";
import { logger } from "@/lib/logger";
import type {
  KanoonSearchResponse,
  KanoonDocResponse,
  KanoonMetaResponse,
  KanoonFragmentResponse,
  KanoonOrigDocResponse,
  KanoonFilter,
  KanoonProviderHealth,
} from "./types";

export class KanoonUnavailableError extends Error {
  constructor() {
    super("Indian Kanoon API not configured.");
    this.name = "KanoonUnavailableError";
  }
}

/* =========================================================================
 * Verified Indian Kanoon API client.
 *
 * Contract confirmed against the live API (see provider capability matrix):
 *   - Auth:      Authorization: Token <token>
 *   - Body:      form-urlencoded (formInput, pagenum, ...)
 *   - JSON:      via Accept: application/json
 *   - Endpoints: POST /search/           {categories, docs[], found, encodedformInput}
 *                POST /doc/<tid>/        {tid, title, doc, publishdate, courtcopy, ...}
 *                POST /docmeta/<tid>/    {tid, title, caseno, doctype, numcites, ...}
 *                POST /docfragment/<tid>/  {headline[], title, formInput, tid}
 *                POST /origdoc/<tid>/    {doc: base64 court copy, Content-Type}
 * pagenum is zero-based.
 * ========================================================================= */

const SEARCH_PAGE_SIZE = 10;

async function kanoonFetch(
  path: string,
  body: Record<string, string>,
  timeoutMs: number,
  accept: string = "application/json"
): Promise<Response> {
  if (!hasIndianKanoon) throw new KanoonUnavailableError();
  const url = `${config.indianKanoon.baseUrl}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Token ${config.indianKanoon.apiKey}`,
        Accept: accept,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(body).toString(),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function kanoonJson<T>(path: string, body: Record<string, string>): Promise<T> {
  const res = await kanoonFetch(path, body, config.indianKanoon.timeoutMs);
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    logger.warn("kanoon_http", {
      path,
      status: res.status,
      detail: detail.slice(0, 200),
    });
    throw new Error(`Indian Kanoon request failed (${res.status}).`);
  }
  return (await res.json()) as T;
}

export async function searchKanoon(
  q: string,
  filter: KanoonFilter = {}
): Promise<KanoonSearchResponse> {
  const body: Record<string, string> = { formInput: q, pagenum: "0" };
  if (filter.pagenum !== undefined) body.pagenum = String(filter.pagenum);
  if (filter.fromdate) body.fromdate = filter.fromdate;
  if (filter.todate) body.todate = filter.todate;
  if (filter.sortby === "date") body.sortby = "date";
  return kanoonJson<KanoonSearchResponse>("/search/", body);
}

export async function getKanoonDoc(tid: number): Promise<KanoonDocResponse> {
  return kanoonJson<KanoonDocResponse>(`/doc/${tid}/`, {});
}

export async function getKanoonMeta(tid: number): Promise<KanoonMetaResponse> {
  return kanoonJson<KanoonMetaResponse>(`/docmeta/${tid}/`, {});
}

export async function getKanoonFragments(
  tid: number,
  q: string
): Promise<KanoonFragmentResponse> {
  return kanoonJson<KanoonFragmentResponse>(`/docfragment/${tid}/`, {
    formInput: q,
  });
}

export async function getKanoonOrigDoc(tid: number): Promise<KanoonOrigDocResponse> {
  return kanoonJson<KanoonOrigDocResponse>(`/origdoc/${tid}/`, {});
}

export async function checkKanoonHealth(): Promise<KanoonProviderHealth> {
  if (!hasIndianKanoon) {
    return { ok: false, mode: "unconfigured", checkedAt: new Date().toISOString() };
  }
  try {
    const res = await kanoonFetch("/search/", { formInput: "bail", pagenum: "0" }, 10_000);
    return {
      ok: res.ok,
      mode: res.ok ? "live" : "mock",
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return { ok: false, mode: "mock", checkedAt: new Date().toISOString() };
  }
}

export { SEARCH_PAGE_SIZE };
