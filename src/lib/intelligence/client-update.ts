/* =========================================================================
 * Client Update Generator (Section 21) — deterministic, plain-language.
 *
 * Produces a short, copyable update from FACTS only: the latest recorded court
 * activity, what changed since the last check, the next date, and what is
 * pending. No spin, no predictions — just a readable summary a person can send
 * to a client or keep for their own records. Every line traces to a source.
 * ========================================================================= */

import type {
  ClientUpdate,
  CourtDirection,
  MissingItem,
  SnapshotChange,
  SourceRef,
} from "./types";
import type { CaseSnapshotData } from "./inputs";

function latestHearing(snapshot: CaseSnapshotData): CaseSnapshotData["history"][number] | null {
  if (snapshot.history.length === 0) return null;
  return [...snapshot.history].sort((a, b) => (a.hearingDate < b.hearingDate ? -1 : 1)).at(-1) ?? null;
}

export function buildClientUpdate(input: {
  matterTitle: string;
  snapshot: CaseSnapshotData | null;
  changes: SnapshotChange[];
  directions: CourtDirection[];
  missing: MissingItem[];
}): ClientUpdate {
  const { matterTitle, snapshot, changes, directions, missing } = input;
  const sources: SourceRef[] = [];

  // What happened -------------------------------------------------------
  let whatHappened: string;
  if (snapshot) {
    const last = latestHearing(snapshot);
    sources.push({ kind: "ecourts", label: "eCourts — Case record", recordId: snapshot.cnr, retrievedAt: snapshot.capturedAt });
    if (last) {
      const outcome = last.result?.trim() || last.purpose?.trim() || "the matter was listed";
      whatHappened = `On ${last.hearingDate}, ${lowerFirst(outcome)}.`;
    } else {
      whatHappened = "No individual hearings are recorded on the court file yet.";
    }
  } else {
    whatHappened = "No court record has been linked to this matter yet, so there is no official activity to report.";
  }

  // What changed --------------------------------------------------------
  const whatChanged = changes.map((c) => {
    if (c.source) sources.push(c.source);
    return `${c.label}: ${c.before ?? "—"} → ${c.after ?? "—"}`;
  });

  // Next date -----------------------------------------------------------
  const nextDate = snapshot?.nextHearingDate ?? null;

  // What is needed ------------------------------------------------------
  const needed: string[] = [];
  for (const d of directions) {
    if (d.compliance === "pending") {
      needed.push(d.addressee ? `${capitalize(d.addressee)}: ${d.text}` : d.text);
      sources.push(d.source);
    }
  }
  for (const m of missing.slice(0, 4)) {
    needed.push(m.title);
    sources.push(...m.sources);
  }
  const whatIsNeeded = dedupe(needed).slice(0, 6);

  // Plain text ----------------------------------------------------------
  const lines: string[] = [`Update on: ${matterTitle}`, ""];
  lines.push(`What happened: ${whatHappened}`);
  if (whatChanged.length > 0) {
    lines.push("", "What changed since the last update:");
    whatChanged.forEach((c) => lines.push(`  • ${c}`));
  }
  lines.push("", nextDate ? `Next date: ${nextDate}` : "Next date: not scheduled on the record.");
  if (whatIsNeeded.length > 0) {
    lines.push("", "What is needed next:");
    whatIsNeeded.forEach((n) => lines.push(`  • ${n}`));
  }
  lines.push(
    "",
    "Note: This summary is drawn from the recorded case data. Please verify dates and directions against the court file before relying on them."
  );

  return {
    whatHappened,
    whatChanged,
    nextDate,
    whatIsNeeded,
    plainText: lines.join("\n"),
    sources: dedupeSources(sources),
  };
}

function lowerFirst(s: string): string {
  return s.length ? s[0].toLowerCase() + s.slice(1) : s;
}
function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}
function dedupe(arr: string[]): string[] {
  const seen = new Set<string>();
  return arr.filter((x) => {
    const k = x.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
function dedupeSources(sources: SourceRef[]): SourceRef[] {
  const seen = new Set<string>();
  return sources.filter((s) => {
    const k = `${s.kind}|${s.label}|${s.field ?? ""}|${s.recordId ?? ""}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
