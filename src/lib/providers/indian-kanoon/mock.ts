import "server-only";
import type { KanoonSearchResult } from "./types";

/* =========================================================================
 * Safe, clearly-labelled mock Indian Kanoon data. Used when the API key is
 * absent or the live API fails. Never confused with live results — the
 * `mode` field in the research pipeline marks these as mock.
 * ========================================================================= */

const MOCK_RESULTS: KanoonSearchResult[] = [
  {
    tid: 90001,
    title: "Alopi Parshad & Sons Ltd v. Union of India",
    date: "1960-04-20",
    citation: "AIR 1960 SC 588",
    head: "Contract — quantum meruit — money due",
    source: "Supreme Court of India",
    excerpt:
      "MOCK DEMO DATA. A party who has performed work or delivered goods is entitled to reasonable payment. Illustrative record for the hackathon demo — verify against the official report.",
    numCites: 0,
    numCitedBy: 0,
  },
  {
    tid: 90002,
    title: "M/s Aditya Birla Nuvo Ltd v. Union of India",
    date: "2017-08-11",
    citation: "(2017) 5 SCC 406 (demo)",
    head: "Payment of dues",
    source: "Supreme Court of India",
    excerpt:
      "MOCK DEMO DATA. Illustrative record. Courts generally hold that clear, documented demands strengthen a claim for recovery.",
    numCites: 0,
    numCitedBy: 0,
  },
  {
    tid: 90003,
    title: "State of Maharashtra v. ... (consumer protection)",
    date: "2020-11-15",
    citation: "Demo 2020/CC/001",
    head: "Consumer protection — deficiency of service",
    source: "National Consumer Disputes Redressal Commission",
    excerpt:
      "MOCK DEMO DATA. Deficiency in service gives rise to a consumer claim. Illustrative only.",
    numCites: 0,
    numCitedBy: 0,
  },
];

export function mockSearch(q: string): KanoonSearchResult[] {
  const terms = q.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  if (terms.length === 0) return MOCK_RESULTS;
  const scored = MOCK_RESULTS.map((r) => {
    const hay = `${r.title} ${r.head} ${r.excerpt}`.toLowerCase();
    let score = 0;
    for (const term of terms) if (hay.includes(term)) score += 1;
    return { r, score };
  });
  const sorted = scored.sort((a, b) => b.score - a.score);
  return sorted.some((s) => s.score > 0)
    ? sorted.map((s) => s.r)
    : MOCK_RESULTS;
}

export function mockDoc(tid: number) {
  const found = MOCK_RESULTS.find((r) => r.tid === tid);
  if (!found) return null;
  return {
    tid,
    title: found.title,
    publishdate: found.date,
    docsource: found.source,
    doc: found.excerpt,
    numcites: 0,
    numcitedby: 0,
    courtcopy: false,
  };
}
