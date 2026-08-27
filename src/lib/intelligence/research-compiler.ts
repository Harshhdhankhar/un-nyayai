/* =========================================================================
 * Natural-language Research Compiler + Authority Relevance.
 *
 * compileResearchIntent turns a plain-language ask ("recent High Court
 * judgments on cheque bounce under section 138") into a structured, inspectable
 * query — so the user sees exactly WHAT was searched. rankAuthorities scores
 * results with fully TRANSPARENT signals; the number is a relevance-to-your-
 * query measure, explicitly NOT a prediction of legal strength or of winning.
 * Pure & deterministic.
 * ========================================================================= */

import type {
  AuthorityRelevance,
  AuthorityRelevanceSignal,
  ResearchIntent,
} from "./types";
import type { KanoonSearchResult } from "@/lib/providers/indian-kanoon/types";

const COURT_TERMS: Array<{ re: RegExp; label: string }> = [
  { re: /supreme court/i, label: "Supreme Court of India" },
  { re: /high court/i, label: "High Court" },
  { re: /district court|sessions court|trial court/i, label: "District / Sessions Court" },
  { re: /nclt|national company law/i, label: "NCLT" },
  { re: /nclat/i, label: "NCLAT" },
  { re: /consumer (forum|commission)|ncdrc/i, label: "Consumer Commission" },
  { re: /tribunal/i, label: "Tribunal" },
];

const CONCEPTS = [
  "anticipatory bail", "bail", "maintenance", "dowry", "cheque bounce", "cheque dishonour",
  "eviction", "specific performance", "wrongful termination", "unfair dismissal", "gratuity",
  "deficiency in service", "consumer", "quashing", "injunction", "defamation", "negligence",
  "custody", "divorce", "partition", "possession", "arbitration", "compensation",
  "reinstatement", "provident fund", "sexual harassment", "domestic violence",
];

function extractProvisions(text: string): string[] {
  const out = new Set<string>();
  const secRe = /\b(?:section|sec\.?|s\.)\s?(\d+[A-Za-z-]*)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = secRe.exec(text)) !== null) out.add(`Section ${m[1]}`);
  for (const act of ["IPC", "CrPC", "CPC", "NI Act", "BNS", "BNSS", "BSA", "Consumer Protection Act", "Evidence Act", "Contract Act"]) {
    if (new RegExp(`\\b${act.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text)) out.add(act);
  }
  return [...out];
}

function extractConcepts(text: string): string[] {
  const lower = text.toLowerCase();
  return CONCEPTS.filter((c) => lower.includes(c));
}

function extractPhrases(text: string): string[] {
  const out: string[] = [];
  const q = text.match(/"([^"]+)"/g);
  if (q) out.push(...q.map((s) => s.replace(/"/g, "").trim()).filter(Boolean));
  return out;
}

function extractDateRange(text: string): { from: string | null; to: string | null; label: string } {
  const year = new Date().getFullYear();
  const lastN = text.match(/last\s+(\d{1,2})\s+years?/i);
  if (lastN) {
    const n = Number(lastN[1]);
    return { from: `${year - n}-01-01`, to: `${year}-12-31`, label: `in the last ${n} years` };
  }
  const between = text.match(/between\s+(\d{4})\s+and\s+(\d{4})/i);
  if (between) {
    return { from: `${between[1]}-01-01`, to: `${between[2]}-12-31`, label: `between ${between[1]} and ${between[2]}` };
  }
  const since = text.match(/(?:since|after|from)\s+(\d{4})/i);
  if (since) return { from: `${since[1]}-01-01`, to: `${year}-12-31`, label: `since ${since[1]}` };
  const inYear = text.match(/\bin\s+(\d{4})\b/i);
  if (inYear) return { from: `${inYear[1]}-01-01`, to: `${inYear[1]}-12-31`, label: `in ${inYear[1]}` };
  if (/recent|latest|newest/i.test(text)) {
    return { from: `${year - 5}-01-01`, to: `${year}-12-31`, label: "recent (last 5 years)" };
  }
  return { from: null, to: null, label: "" };
}

export function compileResearchIntent(
  topic: string,
  ctx: { court?: string | null; jurisdiction?: string | null } = {}
): ResearchIntent {
  const text = topic.trim();
  const court = ctx.court?.trim() || COURT_TERMS.find((c) => c.re.test(text))?.label || "";
  const concepts = extractConcepts(text);
  const provisions = extractProvisions(text);
  const phrases = extractPhrases(text);
  const range = extractDateRange(text);

  // What we actually send: quoted phrases + provisions + concepts, else the raw ask.
  const queryParts = [
    ...phrases.map((p) => `"${p}"`),
    ...provisions,
    ...concepts,
  ];
  const compiledQuery = queryParts.length > 0 ? queryParts.join(" ") : cleanTopic(text);

  const humanBits = [
    "Judgments",
    court ? `from the ${court}` : "",
    concepts.length ? `on ${concepts.join(", ")}` : "",
    provisions.length ? `citing ${provisions.join(", ")}` : "",
    range.label,
  ].filter(Boolean);

  return {
    topic: text,
    jurisdiction: ctx.jurisdiction?.trim() || "India",
    court,
    fromDate: range.from,
    toDate: range.to,
    legalConcepts: concepts,
    searchPhrases: phrases,
    provisions,
    humanQuery: humanBits.join(" ") + ".",
    compiledQuery,
  };
}

function cleanTopic(text: string): string {
  return text
    .replace(/\b(recent|latest|newest|please|find|show|me|judgments?|cases?|about|on|the|from|in)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ------------------------- authority relevance -------------------------- */

function yearOf(date: string): number | null {
  const m = date.match(/\b(19|20)\d{2}\b/);
  return m ? Number(m[0]) : null;
}

export function rankAuthorities(
  results: KanoonSearchResult[],
  intent: ResearchIntent
): AuthorityRelevance[] {
  const conceptWords = intent.legalConcepts.join(" ").toLowerCase().split(/\s+/).filter(Boolean);
  const currentYear = new Date().getFullYear();

  const ranked = results.map((r) => {
    const hay = `${r.title} ${r.head} ${r.excerpt}`.toLowerCase();
    const signals: AuthorityRelevanceSignal[] = [];

    // 1) Concept keyword coverage (max 0.40).
    if (conceptWords.length > 0) {
      const hits = conceptWords.filter((w) => hay.includes(w)).length;
      const frac = hits / conceptWords.length;
      if (frac > 0) {
        signals.push({
          label: "Matches your query terms",
          detail: `${hits} of ${conceptWords.length} query terms appear in the title/summary.`,
          weight: round2(0.4 * frac),
        });
      }
    }

    // 2) Provision match (0.20).
    const provHit = intent.provisions.find((p) => hay.includes(p.toLowerCase()));
    if (provHit) {
      signals.push({
        label: "Cites the same provision",
        detail: `Mentions ${provHit}.`,
        weight: 0.2,
      });
    }

    // 3) Court level match (0.15).
    if (intent.court && `${r.source} ${r.title}`.toLowerCase().includes(intent.court.toLowerCase().split(" ")[0])) {
      signals.push({ label: "Same court level", detail: `From ${r.source || intent.court}.`, weight: 0.15 });
    }

    // 4) Recency within requested window (0.15).
    const y = yearOf(r.date);
    if (y) {
      const age = currentYear - y;
      if (age >= 0 && age <= 10) {
        const w = round2(0.15 * (1 - age / 10));
        if (w > 0) signals.push({ label: "Recency", detail: `Decided in ${y}.`, weight: w });
      }
    }

    // 5) How often it is cited by later cases (0.10, log-scaled).
    if (r.numCitedBy > 0) {
      const w = round2(Math.min(0.1, (Math.log10(r.numCitedBy + 1) / 3) * 0.1));
      if (w > 0) {
        signals.push({
          label: "Cited by later cases",
          detail: `Cited by ${r.numCitedBy} later document(s).`,
          weight: w,
        });
      }
    }

    const relevance = Math.round(signals.reduce((s, x) => s + x.weight, 0) * 100);
    return {
      tid: r.tid,
      title: r.title,
      court: r.source || intent.court || "",
      date: r.date,
      url: `https://indiankanoon.org/doc/${r.tid}/`,
      relevance,
      signals,
    } satisfies AuthorityRelevance;
  });

  return ranked.sort((a, b) => b.relevance - a.relevance);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
