/* =========================================================================
 * Change Intelligence — snapshot diffing.
 *
 * Answers "what changed since your last check?" by diffing the two most recent
 * eCourts snapshots for a matter. Pure and deterministic: every reported change
 * is a literal before/after of a stored field, attributed to the eCourts
 * record. No change is inferred or embellished.
 * ========================================================================= */

import type { SnapshotChange, SourceRef } from "./types";
import type { CaseSnapshotData } from "./inputs";

function ecourtsField(cnr: string, field: string, retrievedAt: string): SourceRef {
  return { kind: "ecourts", label: "eCourts — Case record", field, recordId: cnr, retrievedAt };
}

/**
 * Diff a previous snapshot against the current one. When there is no previous
 * snapshot (first capture), returns an empty list — there is nothing to compare.
 */
export function diffSnapshots(
  prev: CaseSnapshotData | null,
  curr: CaseSnapshotData
): SnapshotChange[] {
  if (!prev) return [];
  const changes: SnapshotChange[] = [];
  const at = curr.capturedAt;

  const push = (
    kind: SnapshotChange["kind"],
    label: string,
    before: string | null,
    after: string | null,
    field: string
  ) => {
    changes.push({ kind, label, before, after, source: ecourtsField(curr.cnr, field, at) });
  };

  if (norm(prev.caseStatus) !== norm(curr.caseStatus)) {
    push("status_changed", "Case status", prev.caseStatus, curr.caseStatus, "case_status");
  }
  if (norm(prev.stage) !== norm(curr.stage)) {
    push("stage_changed", "Stage", prev.stage, curr.stage, "stage");
  }
  if (norm(prev.nextHearingDate) !== norm(curr.nextHearingDate)) {
    const kind = prev.nextHearingDate ? "next_hearing_changed" : "new_listing";
    push(kind, "Next hearing date", prev.nextHearingDate, curr.nextHearingDate, "next_hearing_date");
  }
  const prevCount = prev.orderCount ?? 0;
  const currCount = curr.orderCount ?? 0;
  if (currCount > prevCount) {
    const added = currCount - prevCount;
    push(
      "new_order",
      added === 1 ? "New order on record" : `${added} new orders on record`,
      String(prevCount),
      String(currCount),
      "orders"
    );
  }
  if (norm(prev.petitioner) !== norm(curr.petitioner)) {
    push("party_updated", "Petitioner on record", prev.petitioner, curr.petitioner, "petitioner");
  }
  if (norm(prev.respondent) !== norm(curr.respondent)) {
    push("party_updated", "Respondent on record", prev.respondent, curr.respondent, "respondent");
  }

  return changes;
}

function norm(v: string | null | undefined): string {
  return (v ?? "").trim().toLowerCase();
}
