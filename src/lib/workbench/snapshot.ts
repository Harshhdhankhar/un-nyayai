/* =========================================================================
 * Matter Snapshot — a concise one-page view.
 *
 * Pulls the most decision-relevant facts, disputes, evidence, directions,
 * authorities, actions and risks from the assembled reasoning into one field.
 * Every field is traceable to its source.
 * ========================================================================= */

import type { MatterBundle } from "@/lib/intelligence/inputs";
import type { CourtDirection, MissingItem } from "@/lib/intelligence/types";
import type {
  Chronology,
  FactLedgerEntry,
  Issue,
  MatterSnapshot,
  SmartAction,
} from "./types";

export interface SnapshotContext {
  bundle: MatterBundle;
  issues: Issue[];
  factLedger: FactLedgerEntry[];
  directions: CourtDirection[];
  missing: MissingItem[];
  chronology: Chronology;
  actions: SmartAction[];
  nextHearing: string | null;
  hearingHistory: Array<{ date: string; purpose: string; result: string }>;
}

export function buildMatterSnapshot(ctx: SnapshotContext): MatterSnapshot {
  const { bundle, issues, factLedger, directions, missing, chronology, actions, nextHearing, hearingHistory } = ctx;

  const keyFacts = factLedger
    .filter((f) => f.status !== "MISSING")
    .slice(0, 8)
    .map((f) => ({
      label: f.statement,
      value: f.value ?? "",
      sources: f.sources,
    }));

  const disputedFacts = factLedger
    .filter((f) => f.status === "CONFLICTING")
    .map((f) => ({
      label: f.statement,
      value: f.conflictingSources.map((c) => c.label).join(", "),
      sources: f.sources,
    }));

  const importantEvidence = bundle.evidence
    .filter((e) => e.status === "available")
    .map((e) => e.title);
  const missingEvidence = [
    ...bundle.evidence.filter((e) => e.status === "missing").map((e) => e.title),
    ...missing.filter((m) => m.title).map((m) => m.title),
  ];
  const pendingDirections = directions
    .filter((d) => d.compliance === "pending")
    .map((d) => d.text);
  const relevantAuthorities = bundle.sources.map((s) => s.title);
  const nextActions = actions.map((a) => a.title);

  const risks: string[] = [];
  for (const c of chronology.findings) risks.push(c.title);
  for (const d of directions.filter((x) => x.deadline?.dueDate && x.compliance !== "possibly_done"))
    risks.push(`Possible deadline: ${d.deadline!.dueDate} (${d.text.slice(0, 60)}…)`);

  return {
    matterTitle: bundle.title,
    currentStage: bundle.nextAction ?? bundle.status ?? null,
    nextHearing,
    keyIssues: issues.slice(0, 8).map((i) => i.question),
    keyFacts,
    disputedFacts,
    importantEvidence,
    missingEvidence,
    pendingDirections,
    relevantAuthorities,
    nextActions,
    risks,
    hearingHistory,
    generatedAt: new Date().toISOString(),
  };
}
