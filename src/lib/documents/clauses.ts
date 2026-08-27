/**
 * Clause segmentation: splits raw document text into clause-like sections
 * using numbered headings ("1.", "3.2", "Clause 7 —"), ALL-CAPS headings and
 * known legal heading words. Pure and deterministic.
 */
import type { ExtractedClause } from "./types";

interface HeadingMatch {
  title: string;
  start: number;
}

const HEADING_RE = [
  // "1. TITLE" / "3.2 Title" at line start
  /(?:^|\n)\s*(\d{1,2}(?:\.\d{1,2})*)[.)]?\s+([A-Z][^\n]{2,90})/g,
  // "CLAUSE NAME:" all-caps line
  /(?:^|\n)\s*([A-Z][A-Z \-&()']{6,80}):?\s*(?:\n|$)/g,
  // "Clause 5 — Rent"
  /(?:^|\n)\s*(?:clause|article|section)\s+(\d{1,2})\s*[:\-–—]\s*([A-Za-z][^\n]{2,90})/gi,
];

/** Canonical categories recognized from a clause title. */
export const CLAUSE_CATEGORIES: { category: string; patterns: RegExp[] }[] = [
  { category: "Rent", patterns: [/\brent\b/i, /\bmonthly\s+(?:compensation|charge)/i] },
  { category: "Security Deposit", patterns: [/security\s+deposit/i, /^deposit\b/i] },
  { category: "Termination", patterns: [/terminat/i] },
  { category: "Notice Period", patterns: [/notice\s+period/i, /\bnotice\s+in\s+writing/i] },
  { category: "Maintenance", patterns: [/maintenance/i, /\bupkeep\b/i, /\brepairs?\b/i] },
  { category: "Rent Escalation", patterns: [/escalat/i, /\bincrease\s+(?:of\s+)?rent/i, /\brevision\s+of\s+rent/i] },
  { category: "Subletting", patterns: [/sub-?let/i, /\bsub-?tenan/i, /\bassign(?:ment)?\s+of\s+(?:the\s+)?premises/i] },
  { category: "Lock-in Period", patterns: [/lock-?in/i] },
  { category: "Renewal", patterns: [/renewal/i, /\brenew\b/i] },
  { category: "Dispute Resolution", patterns: [/dispute\s+resolution/i, /\barbitration\b/i, /\bmediation\b/i] },
  { category: "Jurisdiction", patterns: [/jurisdiction/i, /\bgoverning\s+law\b/i, /\bapplicable\s+law\b/i, /\bcourts?\s+at\b/i] },
  { category: "Confidentiality", patterns: [/confidential/i] },
  { category: "Non-Compete", patterns: [/non-?compet/i, /\brestrictive\s+covenant/i] },
  { category: "Indemnification", patterns: [/indemnif/i] },
  { category: "Payment Terms", patterns: [/payment\b/i, /\bconsideration\b/i, /\bremuneration\b/i, /\bsalary\b/i, /\bwages\b/i] },
  { category: "Default", patterns: [/\bevent[s]? of default\b/i, /\bin\s+default\b/i, /\bbreach\b/i] },
  { category: "Liability", patterns: [/liabilit/i, /\bdamages\b/i] },
  { category: "Force Majeure", patterns: [/force\s+majeure/i, /\bact\s+of\s+god\b/i] },
  { category: "Intellectual Property", patterns: [/intellectual\s+property/i, /\bip\s+rights\b/i] },
  { category: "Possession", patterns: [/possession/i] },
  { category: "Stamp Duty & Registration", patterns: [/stamp\s+duty/i, /\bregistration\b/i] },
];

function pageForOffset(offset: number, pageOffsets: number[]): number | null {
  if (pageOffsets.length === 0) return null;
  let page = 1;
  for (let i = 0; i < pageOffsets.length; i++) {
    if (pageOffsets[i] <= offset) page = i + 1;
    else break;
  }
  return page;
}

function findHeadings(text: string): HeadingMatch[] {
  const found: HeadingMatch[] = [];
  const seen = new Set<number>();
  for (const re of HEADING_RE) {
    for (const m of text.matchAll(re)) {
      let full = (m[1] && m[2] ? `${m[1]}. ${m[2]}` : (m[2] ?? m[1]) ?? "").trim();
      if (!full || full.length < 4) continue;
      // Strip the leading ordinal ("1.", "3.2") so punctuation inside it
      // doesn't confuse the title boundary, then stop at a colon.
      full = full.replace(/^\d{1,2}(?:\.\d{1,2})*[.)]?\s*/, "");
      const colonIdx = full.search(/:(\s|$)/);
      if (colonIdx > 2) full = full.slice(0, colonIdx);
      else {
        // No colon: cut at the first sentence end past a few words.
        const sent = full.search(/[.](\s|$)/);
        if (sent > 30) full = full.slice(0, sent);
      }
      if (full.length > 80) {
        full = full.slice(0, 80).replace(/\s+\S*$/, "");
      }
      if (full.length < 4) continue;
      const start = m.index + (m[0].startsWith("\n") ? 1 : 0);
      if ([...seen].some((s) => Math.abs(s - start) < 3)) continue;
      seen.add(start);
      found.push({ title: full.replace(/[:\-–—]\s*$/, "").slice(0, 100), start });
    }
  }
  return found.sort((a, b) => a.start - b.start);
}

function categorize(title: string): string | null {
  for (const { category, patterns } of CLAUSE_CATEGORIES) {
    if (patterns.some((p) => p.test(title))) return category;
  }
  return null;
}

/**
 * Split text into clauses. Falls back to paragraph blocks when no headings
 * are detected so downstream analysis still has meaningful units. Long
 * documents are capped at 120 clauses.
 */
export function extractClauses(
  text: string,
  pageOffsets: number[] = []
): ExtractedClause[] {
  const clean = text.replace(/\r/g, "");
  if (!clean.trim()) return [];

  const headings = findHeadings(clean);
  if (headings.length < 2) {
    // Fallback: paragraphs as pseudo-clauses.
    return clean
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 60)
      .slice(0, 40)
      .map((p, i) => {
        const offset = clean.indexOf(p.slice(0, 60));
        return {
          title: `Paragraph ${i + 1}`,
          text: p,
          page: pageForOffset(Math.max(0, offset), pageOffsets),
          category: null,
        };
      });
  }

  const clauses: ExtractedClause[] = [];
  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].start;
    const end = i + 1 < headings.length ? headings[i + 1].start : Math.min(clean.length, start + 4000);
    const body = clean.slice(start, end).trim();
    if (body.length < 20) continue;
    if (clauses.length >= 120) break;
    clauses.push({
      title: headings[i].title,
      text: body.slice(0, 2500),
      page: pageForOffset(start, pageOffsets),
      category: categorize(headings[i].title),
    });
  }
  return clauses;
}
