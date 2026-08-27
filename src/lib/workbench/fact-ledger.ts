/* =========================================================================
 * Fact Ledger — the canonical, source-backed factual foundation.
 *
 * Every important fact becomes a row with a value, a date, its sources, a
 * coverage status and any conflicting source. Rows are grounded in stored
 * matter facts plus document/ecourts extraction. This ledger is the factual
 * foundation all Workbench surfaces read from.
 * ========================================================================= */

import type { MatterBundle } from "@/lib/intelligence/inputs";
import type { Contradiction } from "@/lib/intelligence/types";
import { userRef, documentRef, systemRef } from "@/lib/intelligence/provenance";
import { extractAmounts, extractDates } from "@/lib/intelligence/extract";
import { tokenize } from "./util";
import type { FactLedgerEntry, Issue, LedgerStatus, SourceRef } from "./types";

function factSources(fact: MatterBundle["facts"][number]): SourceRef[] {
  if (fact.source === "ecourts")
    return [{ kind: "ecourts", label: "eCourts — Case record", field: "fact", passage: fact.fact }];
  if (fact.source === "document" || fact.kind === "extracted")
    return [documentRef("Uploaded document", { passage: fact.fact })];
  return [userRef("Your statement", fact.id)];
}

export function buildFactLedger(
  bundle: MatterBundle,
  opts: { issues?: Issue[]; contradictions?: Contradiction[] } = {}
): FactLedgerEntry[] {
  const issueIndex = new Map<string, string[]>();
  for (const issue of opts.issues ?? []) {
    for (const fid of issue.factIds) {
      const arr = issueIndex.get(fid) ?? [];
      arr.push(issue.id);
      issueIndex.set(fid, arr);
    }
  }

  const contradictions = opts.contradictions ?? [];
  const entries: FactLedgerEntry[] = [];

  for (const fact of bundle.facts) {
    const sources = factSources(fact);

    // Derive value + date deterministically from the fact text.
    const amounts = extractAmounts(fact.fact);
    const dates = extractDates(fact.fact);
    const value = amounts.length
      ? `₹${amounts[0].value.toLocaleString("en-IN")}`
      : undefined;
    const date = dates[0]?.iso ?? undefined;

    // Conflict detection: does this fact share salient words with any
    // contradiction value from another source?
    const fk = new Set(tokenize(fact.fact));
    let conflicting: SourceRef[] = [];
    let isConflicting = false;
    for (const con of contradictions) {
      const hits = con.values.filter((v) => {
        const vk = new Set(tokenize(v.value));
        for (const k of vk) if (fk.has(k)) return true;
        return false;
      });
      if (hits.length >= 2 || (hits.length === 1 && con.values.length > 1)) {
        isConflicting = true;
        conflicting = con.values.map((v) => v.source);
      }
    }

    let status: LedgerStatus;
    if (fact.kind === "missing") status = "MISSING";
    else if (isConflicting) status = "CONFLICTING";
    else if (fact.source === "ecourts") status = "COURT_RECORD";
    else if (fact.source === "document" || fact.kind === "extracted") status = "DOCUMENT_SUPPORTED";
    else status = "USER_PROVIDED";

    entries.push({
      id: fact.id,
      statement: fact.fact,
      value,
      date,
      sources,
      status,
      relatedIssueIds: issueIndex.get(fact.id) ?? [],
      conflictingSources: conflicting,
    });
  }

  // If there are no stored facts but there are documents, surface a single
  // system note so the ledger is never silently empty of context.
  if (entries.length === 0 && bundle.documents.length > 0) {
    entries.push({
      id: "ledger-docs",
      statement: "Documents are uploaded but no individual facts have been recorded from them yet.",
      status: "UNKNOWN",
      sources: [systemRef("Derived from matter", `${bundle.documents.length} document(s) uploaded`)],
      relatedIssueIds: [],
      conflictingSources: [],
    });
  }

  return entries;
}
