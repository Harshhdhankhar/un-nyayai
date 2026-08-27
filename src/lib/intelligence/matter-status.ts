/* =========================================================================
 * Matter Status — a set of meaningful, source-backed status sections.
 *
 * Deliberately NOT a single "health percentage". Each section describes the
 * state of one kind of information in the matter (facts, evidence, court
 * data, research, directions, upcoming) as GOOD / ATTENTION / MISSING /
 * NEEDS_REFRESH, plus a plain-language reason grounded in the records.
 * ========================================================================= */

import "server-only";

export type MatterStatus = "good" | "attention" | "missing" | "needs_refresh";

export interface StatusSection {
  key: "facts" | "evidence" | "court_data" | "research" | "directions" | "upcoming";
  label: string;
  status: MatterStatus;
  detail: string;
}

export interface MatterStatusInput {
  factCount: number;
  missingFactCount: number;
  evidenceAvailable: number;
  evidenceMissing: number;
  hasCnr: boolean;
  hasSnapshot: boolean;
  snapshotAgeDays: number | null;
  staleSnapshot: boolean;
  researchCount: number;
  staleSourceCount: number;
  verifiedSourceCount: number;
  pendingDirectionCount: number;
  contradictionCount: number;
  nextHearingDate: string | null;
  hasDeadline: boolean;
}

/** Six status sections that answer "is the matter's information in good shape?" */
export function buildMatterStatus(input: MatterStatusInput): StatusSection[] {
  const sections: StatusSection[] = [];

  sections.push(
    input.factCount === 0
      ? { key: "facts", label: "Situation & facts", status: "missing", detail: "No facts recorded yet. Add the situation so analysis can begin." }
      : input.missingFactCount === 0
        ? { key: "facts", label: "Situation & facts", status: "good", detail: `${input.factCount} fact${input.factCount === 1 ? "" : "s"} recorded, none flagged missing.` }
        : { key: "facts", label: "Situation & facts", status: "attention", detail: `${input.factCount} fact${input.factCount === 1 ? "" : "s"} recorded with ${input.missingFactCount} still missing.` }
  );

  sections.push(
    input.evidenceMissing > 0
      ? { key: "evidence", label: "Evidence", status: "attention", detail: `${input.evidenceMissing} expected item${input.evidenceMissing === 1 ? "" : "s"} not yet linked.` }
      : input.evidenceAvailable === 0
        ? { key: "evidence", label: "Evidence", status: "missing", detail: "No evidence has been attached to this matter." }
        : { key: "evidence", label: "Evidence", status: "good", detail: `${input.evidenceAvailable} evidence item${input.evidenceAvailable === 1 ? "" : "s"} linked, none missing.` }
  );

  sections.push(
    !input.hasCnr
      ? { key: "court_data", label: "Court record", status: "missing", detail: "No CNR number recorded, so official court data can't be tracked." }
      : !input.hasSnapshot
        ? { key: "court_data", label: "Court record", status: "attention", detail: "CNR recorded but the court record has not been fetched yet." }
        : input.staleSnapshot
          ? { key: "court_data", label: "Court record", status: "needs_refresh", detail: `Last checked ${formatDays(input.snapshotAgeDays)} ago — refresh to confirm nothing changed.` }
          : { key: "court_data", label: "Court record", status: "good", detail: input.snapshotAgeDays === 0 ? "Checked today." : `Checked ${formatDays(input.snapshotAgeDays)} ago.` }
  );

  sections.push(
    input.researchCount === 0
      ? { key: "research", label: "Research & sources", status: "missing", detail: "No legal sources attached yet." }
      : input.staleSourceCount > 0
        ? { key: "research", label: "Research & sources", status: "needs_refresh", detail: `${input.staleSourceCount} source${input.staleSourceCount === 1 ? "" : "s"} are stale — confirm the law is still current.` }
        : { key: "research", label: "Research & sources", status: "good", detail: `${input.researchCount} source${input.researchCount === 1 ? "" : "s"} attached, ${input.verifiedSourceCount} verified.` }
  );

  sections.push(
    input.contradictionCount > 0
      ? { key: "directions", label: "Directions & conflicts", status: "attention", detail: `${input.contradictionCount} possible contradiction${input.contradictionCount === 1 ? "" : "s"} between records to review.` }
      : input.pendingDirectionCount > 0
        ? { key: "directions", label: "Directions & conflicts", status: "attention", detail: `${input.pendingDirectionCount} court direction${input.pendingDirectionCount === 1 ? "" : "s"} still pending.` }
        : { key: "directions", label: "Directions & conflicts", status: "good", detail: "No unresolved directions or flagged conflicts." }
  );

  sections.push(
    input.nextHearingDate
      ? { key: "upcoming", label: "Upcoming", status: "good", detail: `Next hearing on ${input.nextHearingDate}.` }
      : input.hasDeadline
        ? { key: "upcoming", label: "Upcoming", status: "good", detail: "A deadline is on record." }
        : { key: "upcoming", label: "Upcoming", status: "attention", detail: "No upcoming hearing date or deadline is on record." }
  );

  return sections;
}

function formatDays(days: number | null): string {
  if (days === null || days === undefined) return "some time";
  if (days === 0) return "today";
  if (days === 1) return "1 day";
  return `${days} days`;
}