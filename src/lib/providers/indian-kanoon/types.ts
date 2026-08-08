/* =========================================================================
 * Indian Kanoon API types — shaped from the verified live responses.
 * ========================================================================= */

export interface KanoonSearchDoc {
  tid: number;
  title: string;
  publishdate: string;
  author: string;
  authorid?: number;
  bench?: number[];
  catids?: number[] | null;
  doctype?: number;
  docsource: string;
  headline?: string;
  numcites: number;
  numcitedby: number;
  fragment?: boolean;
}

export interface KanoonSearchResponse {
  categories: unknown[];
  docs: KanoonSearchDoc[];
  found: number;
  encodedformInput: string;
}

export interface KanoonDocResponse {
  tid: number;
  title: string;
  publishdate: string;
  doc: string;
  docsource: string;
  numcites: number;
  numcitedby: number;
  courtcopy?: boolean;
  citetid?: number[] | null;
  divtype?: string;
}

export interface KanoonMetaResponse {
  tid: number;
  title: string;
  publishdate: string;
  caseno: string;
  doctype: string;
  relurl: string;
  numcites: number;
  numcitedby: number;
}

export interface KanoonFragmentResponse {
  tid: number;
  title: string;
  formInput: string;
  headline: string[];
}

export interface KanoonOrigDocResponse {
  doc: string;
  "Content-Type"?: string;
}

export interface KanoonFilter {
  pagenum?: number;
  fromdate?: string;
  todate?: string;
  sortby?: "relevance" | "date";
}

export interface KanoonProviderHealth {
  ok: boolean;
  mode: "live" | "mock" | "unconfigured";
  checkedAt: string;
}

export interface KanoonSearchResult {
  tid: number;
  title: string;
  date: string;
  citation: string;
  head: string;
  source: string;
  excerpt: string;
  numCites: number;
  numCitedBy: number;
}

export interface KanoonDocument {
  tid: number;
  title: string;
  date: string;
  caseNo: string;
  doctype: string;
  fullText: string;
  source: string;
  numCites: number;
  numCitedBy: number;
  courtCopyBase64?: string;
  fragments: string[];
}
