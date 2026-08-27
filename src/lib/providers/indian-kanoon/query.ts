/* =========================================================================
 * Indian Kanoon query structurer.
 *
 * Turns a natural-language research question into a cleaner keyword query
 * plus optional date-range filters, without inventing capabilities. Court
 * detection only maps a small set of courts to Indian Kanoon's documented
 * `court:` search token; anything ambiguous is left untouched.
 *
 * The source sentence is never sent verbatim — filler and lead-ins are
 * stripped so the provider receives a focused query.
 * ========================================================================= */

import type { KanoonFilter } from "./types";

export interface StructuredKanoonQuery {
  query: string;
  filter: KanoonFilter;
  court: string | null;
  yearHint: string | null;
}

/** Court alias -> Indian Kanoon `court:` token (documented search syntax). */
const COURT_TOKENS: Record<string, string> = {
  "supreme court": "SC",
  "the supreme court": "SC",
  sc: "SC",
  "delhi high court": "delhi",
  "high court of delhi": "delhi",
  delhi: "delhi",
  "bombay high court": "bombay",
  "high court of bombay": "bombay",
  bombay: "bombay",
  "calcutta high court": "cal",
  calcutta: "cal",
  "madras high court": "madras",
  madras: "madras",
};

const FILLER = new Set([
  "find", "get", "look", "search", "for", "the", "a", "an", "of", "on", "in", "about",
  "please", "can", "you", "me", "judgments", "judgements", "judgment", "judgement",
  "cases", "case", "relating", "regarding", "concerning", "having", "given", "passed",
  "issued", "decided", "any", "recent", "recently", "latest", "law", "legal", "precedent",
]);

/** Normalize whitespace and strip leading/trailing punctuation. */
function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Remove a matched phrase from the remaining keyword text. */
function stripPhrase(query: string, phrase: string): string {
  const re = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "i");
  return clean(query.replace(re, " ")).replace(/\s+/g, " ");
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function detectCourt(query: string): { token: string | null; label: string | null; rest: string } {
  const lower = query.toLowerCase();
  for (const alias of Object.keys(COURT_TOKENS)) {
    const re = new RegExp(`\\b${escapeRegExp(alias)}\\b`, "i");
    if (re.test(lower)) {
      return { token: COURT_TOKENS[alias], label: alias, rest: stripPhrase(query, alias) };
    }
  }
  return { token: null, label: null, rest: query };
}

function detectYear(query: string): { from: string | null; to: string | null; hint: string | null; rest: string } {
  // "between 2018 and 2023" / "from 2018 to 2023"
  const range = query.match(/\b(?:between|from)\s+(\d{4})\s+(?:and|to)\s+(\d{4})\b/i);
  if (range) {
    const [full, a, b] = range;
    const lo = Math.min(Number(a), Number(b));
    const hi = Math.max(Number(a), Number(b));
    return { from: `${lo}-01-01`, to: `${hi}-12-31`, hint: `${lo}-${hi}`, rest: stripPhrase(query, full) };
  }
  // "in 2023" / "since 2023"
  const single = query.match(/\b(?:in|since|year)\s+(\d{4})\b/i) ?? query.match(/\b(\d{4})\b/);
  if (single) {
    const [full, y] = single;
    return { from: `${y}-01-01`, to: `${y}-12-31`, hint: y, rest: stripPhrase(query, full) };
  }
  return { from: null, to: null, hint: null, rest: query };
}

export function buildKanoonQuery(natural: string): StructuredKanoonQuery {
  const original = clean(natural);
  if (!original) return { query: "", filter: {}, court: null, yearHint: null };

  const court = detectCourt(original);
  let query = court.rest;
  const year = detectYear(query);
  query = year.rest;

  const tokens = query
    .split(/\s+/)
    .filter((t) => t && !FILLER.has(t.toLowerCase()))
    .join(" ");

  const keyword = clean(tokens);
  const courtToken = court.token ? `court: ${court.token}` : null;

  const final = [keyword, courtToken].filter(Boolean).join(" ");

  const filter: KanoonFilter = {};
  if (year.from) filter.fromdate = year.from;
  if (year.to) filter.todate = year.to;

  return { query: clean(final), filter, court: court.label, yearHint: year.hint };
}