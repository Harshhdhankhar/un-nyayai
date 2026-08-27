/* =========================================================================
 * Order Comparison — deterministic, structured diff between two court orders.
 *
 * Extracts structured elements (directions, dates, amounts, case numbers,
 * provisions, authorities) from BOTH orders first, then compares them
 * deterministically. Groq is only used (by the UI, if at all) for a concise
 * plain-language explanation over the structured result — never as the
 * comparison itself.
 * ========================================================================= */

import {
  extractDirectives,
  extractDates,
  extractAmounts,
  extractCaseNumbers,
} from "./extract";
import type { OrderText } from "./inputs";

const PROVISION_RE = /\b(?:section|sec\.?|s\.)\s?\d+[A-Za-z-]*\b|\b(?:IPC|CrPC|CPC|BNS|BNSS|BSA|NI Act|Evidence Act|Contract Act|Consumer Protection Act)\b/gi;
const AUTHORITY_RE = /\b(?:19|20)\d{2}\s+(?:\d+\s+)?(?:SCC|AIR|SCR)\s+\d+\b|AIR\s+(?:19|20)\d{2}/g;

export interface OrderFacts {
  sourceLabel: string;
  text: string;
  directions: string[];
  dates: string[];
  amounts: string[];
  caseNumbers: string[];
  provisions: string[];
  authorities: string[];
}

export type OrderComparisonKind = "direction_added" | "direction_removed" | "date_changed" | "case_number_added" | "amount_added" | "provision_added" | "authority_added";

export interface OrderComparisonDelta {
  kind: OrderComparisonKind;
  label: string;
  /** First-order value, if present. */
  before: string | null;
  /** Second-order value, if present. */
  after: string | null;
  /** Plain-language explanation of what this means (neutral). */
  note: string;
}

export interface OrderComparison {
  a: OrderFacts;
  b: OrderFacts;
  deltas: OrderComparisonDelta[];
  /** High-level summary, e.g. "2 new directions, 1 removed, next-date changed". */
  summary: string;
  /** Structured next-date comparison when both orders carry a date. */
  nextDate: { a: string | null; b: string | null };
}

export function extractOrderFacts(order: OrderText): OrderFacts {
  const directives = extractDirectives(order.text).map((d) => d.text.toLowerCase().replace(/\s+/g, " ").trim());
  const dates = extractDates(order.text).map((d) => d.iso ?? d.raw);
  const amounts = extractAmounts(order.text).map((a) => a.raw.toLowerCase());
  const caseNumbers = extractCaseNumbers(order.text).map((c) => c.toUpperCase());
  const provisions = [...new Set((order.text.match(PROVISION_RE) ?? []).map((p) => p.toLowerCase()))];
  const authorities = [...new Set((order.text.match(AUTHORITY_RE) ?? []).map((a) => a.toUpperCase()))];

  const unique = (arr: string[]) => [...new Set(arr)];
  return {
    sourceLabel: order.label,
    text: order.text,
    directions: unique(directives),
    dates: unique(dates),
    amounts: unique(amounts),
    caseNumbers: unique(caseNumbers),
    provisions: unique(provisions),
    authorities: unique(authorities),
  };
}

/** Difference helper: items in `newer` not in `older` are "added" (on B). */
function diffSets(older: string[], newer: string[]): { added: string[]; removed: string[] } {
  const a = new Set(older);
  const b = new Set(newer);
  return {
    added: newer.filter((x) => !a.has(x)),
    removed: older.filter((x) => !b.has(x)),
  };
}

export function compareOrders(aText: OrderText, bText: OrderText): OrderComparison {
  const a = extractOrderFacts(aText);
  const b = extractOrderFacts(bText);
  const deltas: OrderComparisonDelta[] = [];

  const dirs = diffSets(a.directions, b.directions);
  for (const d of dirs.added) {
    deltas.push({ kind: "direction_added", label: "New direction", before: null, after: d, note: "This directive appears in the newer order but not the earlier one." });
  }
  for (const d of dirs.removed) {
    deltas.push({ kind: "direction_removed", label: "Direction no longer present", before: d, after: null, note: "This directive was in the earlier order but is not in the newer one." });
  }

  // Next-date change (most useful single signal).
  const nextA = [...a.dates].sort().pop() ?? null;
  const nextB = [...b.dates].sort().pop() ?? null;
  if (nextA && nextB && nextA !== nextB) {
    deltas.push({ kind: "date_changed", label: "Next-date / dated change", before: nextA, after: nextB, note: "The recorded dates differ between the two orders." });
  }

  const nums = diffSets(a.caseNumbers, b.caseNumbers);
  for (const n of nums.added) deltas.push({ kind: "case_number_added", label: "Case number added", before: null, after: n, note: "A case number appears only in the newer order." });

  const amounts = diffSets(a.amounts, b.amounts);
  for (const m of amounts.added) deltas.push({ kind: "amount_added", label: "Amount mentioned", before: null, after: m, note: "An amount appears only in the newer order." });

  const provs = diffSets(a.provisions, b.provisions);
  for (const p of provs.added) deltas.push({ kind: "provision_added", label: "Provision cited", before: null, after: p, note: "A provision is cited only in the newer order." });

  const auths = diffSets(a.authorities, b.authorities);
  for (const t of auths.added) deltas.push({ kind: "authority_added", label: "Authority cited", before: null, after: t, note: "A case/authority is referenced only in the newer order." });

  const added = deltas.filter((d) => d.after).length;
  const removed = deltas.filter((d) => d.kind === "direction_removed").length;
  const summary = [
    added ? `${added} change${added === 1 ? "" : "s"} appearing in the newer order` : null,
    removed ? `${removed} direction${removed === 1 ? "" : "s"} no longer present` : null,
    nextA && nextB && nextA !== nextB ? "the recorded date changed" : null,
  ]
    .filter(Boolean)
    .join("; ");

  return { a, b, deltas, summary: summary || "No material differences detected between the two orders.", nextDate: { a: nextA, b: nextB } };
}