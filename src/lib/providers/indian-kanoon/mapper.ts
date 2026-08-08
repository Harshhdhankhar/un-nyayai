import "server-only";
import type {
  KanoonDocResponse,
  KanoonMetaResponse,
  KanoonSearchDoc,
  KanoonSearchResult,
} from "./types";

/* =========================================================================
 * Mappers for the verified Indian Kanoon API shapes.
 * ========================================================================= */

export function mapSearchDoc(doc: KanoonSearchDoc): KanoonSearchResult {
  return {
    tid: doc.tid,
    title: stripHtml(doc.title),
    date: doc.publishdate || "",
    citation: extractCitation(doc),
    head: stripHtml(doc.headline || "").slice(0, 500),
    source: doc.docsource || "Indian Kanoon",
    excerpt: stripHtml(doc.headline || "").slice(0, 600),
    numCites: doc.numcites ?? 0,
    numCitedBy: doc.numcitedby ?? 0,
  };
}

export function mapDocResponse(
  doc: KanoonDocResponse,
  meta: KanoonMetaResponse | null
) {
  return {
    tid: doc.tid,
    title: stripHtml(doc.title),
    date: doc.publishdate || "",
    caseNo: meta?.caseno || "",
    doctype: meta?.doctype || doc.docsource || "Indian Kanoon",
    fullText: stripHtml(doc.doc || ""),
    source: doc.docsource || "Indian Kanoon",
    numCites: doc.numcites ?? 0,
    numCitedBy: doc.numcitedby ?? 0,
    courtCopy: doc.courtcopy === true,
  };
}

function extractCitation(doc: KanoonSearchDoc): string {
  const m = /\([0-9A-Za-z]+\)\s+[A-Z]+\s+\d+/.exec(doc.title);
  if (m) return m[0];
  if (doc.docsource) {
    const court = doc.docsource.replace(/ Court.*$/, " Court");
    return `${court}, ${doc.publishdate || ""}`.trim();
  }
  return doc.publishdate || "";
}

export function extractCourt(source: string, title: string): string {
  if (source && source !== "Indian Kanoon") return source;
  if (title.toLowerCase().includes("supreme court")) return "Supreme Court of India";
  if (title.toLowerCase().includes("high court")) return "High Court";
  return "Indian Kanoon";
}

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
