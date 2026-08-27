/* =========================================================================
 * Normalized Entities — a single deterministic ledger of key numbers, dates,
 * case numbers and provisions mentioned across a Matter (facts, orders,
 * hearing results, documents).
 *
 * Each entry is normalized (canonical value) and counts how many distinct
 * sources mention it. This is purely descriptive — an entry is NOT a legal
 * conclusion. Source labels are recorded so the user can verify.
 * ========================================================================= */

import { extractAmounts, extractDates, extractCaseNumbers } from "./extract";
import type { MatterBundle, OrderText } from "./inputs";

export interface EntityEntry<T = string> {
  value: T;
  /** How many distinct source texts mention this value. */
  mentions: number;
  /** Labels of the source texts that mention it (for verification). */
  from: string[];
}

export interface EntityLedger {
  amounts: EntityEntry[];
  dates: EntityEntry[];
  caseNumbers: EntityEntry[];
  provisions: EntityEntry[];
  generatedAt: string;
}

const PROVISION_RE = /\b(?:section|sec\.?|s\.)\s?\d+[A-Za-z-]*\b|\b(?:IPC|CrPC|CPC|BNS|BNSS|BSA|NI Act|Evidence Act|Contract Act|Consumer Protection Act|Negotiable Instruments Act)\b/gi;

function countBy<T>(items: Array<{ value: T; sourceLabel: string }>): EntityEntry<T>[] {
  const map = new Map<string, { entry: EntityEntry<T> }>();
  for (const { value, sourceLabel } of items) {
    const key = String(value).toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.entry.mentions += 1;
      if (!existing.entry.from.includes(sourceLabel)) existing.entry.from.push(sourceLabel);
    } else {
      map.set(key, {
        entry: { value, mentions: 1, from: [sourceLabel] },
      });
    }
  }
  return [...map.values()]
    .map((m) => m.entry)
    .sort((a, b) => b.mentions - a.mentions || String(a.value).localeCompare(String(b.value)));
}

export function buildEntityLedger(
  bundle: MatterBundle,
  orders: OrderText[],
  facts: string[]
): EntityLedger {
  const amountItems: Array<{ value: string; sourceLabel: string }> = [];
  const dateItems: Array<{ value: string; sourceLabel: string }> = [];
  const caseNumItems: Array<{ value: string; sourceLabel: string }> = [];
  const provItems: Array<{ value: string; sourceLabel: string }> = [];

  const record = (label: string, text: string) => {
    for (const a of extractAmounts(text)) amountItems.push({ value: a.raw.toLowerCase(), sourceLabel: label });
    for (const d of extractDates(text)) dateItems.push({ value: d.iso ?? d.raw, sourceLabel: label });
    for (const c of extractCaseNumbers(text)) caseNumItems.push({ value: c.toUpperCase(), sourceLabel: label });
    for (const p of text.match(PROVISION_RE) ?? []) provItems.push({ value: p.toLowerCase(), sourceLabel: label });
  };

  facts.forEach((f, i) => record(`Fact ${i + 1}`, f));
  orders.forEach((o) => record(o.label, o.text));

  return {
    amounts: countBy(amountItems),
    dates: countBy(dateItems).sort((a, b) => String(a.value).localeCompare(String(b.value))),
    caseNumbers: countBy(caseNumItems),
    provisions: countBy(provItems),
    generatedAt: new Date().toISOString(),
  };
}

export function summarizeLedger(ledger: EntityLedger): string {
  const parts: string[] = [];
  if (ledger.amounts.length) parts.push(`${ledger.amounts.length} amount${ledger.amounts.length === 1 ? "" : "s"}`);
  if (ledger.dates.length) parts.push(`${ledger.dates.length} date${ledger.dates.length === 1 ? "" : "s"}`);
  if (ledger.caseNumbers.length) parts.push(`${ledger.caseNumbers.length} case number${ledger.caseNumbers.length === 1 ? "" : "s"}`);
  if (ledger.provisions.length) parts.push(`${ledger.provisions.length} provision${ledger.provisions.length === 1 ? "" : "s"}`);
  return parts.length ? `Normalized entities across the matter: ${parts.join(", ")}.` : "No entities extracted yet.";
}