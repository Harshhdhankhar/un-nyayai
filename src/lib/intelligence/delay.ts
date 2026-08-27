/* =========================================================================
 * Advanced Delay Intelligence + Cost of Delay.
 *
 * Builds a factual pattern map of adjournments from the eCourts hearing history
 * using the existing deterministic classifier. Language is strictly factual and
 * never assigns blame ("records show N listings noted a party as absent", not
 * "the opponent is stalling"). Cost of Delay multiplies ONLY user-supplied
 * figures by the count of recorded appearances and is always labelled an
 * estimate — never a claim of recoverable damages.
 * ========================================================================= */

import type {
  CostOfDelay,
  CostOfDelayInput,
  DelayPatternBucket,
  DelayPatternMap,
  SourceRef,
} from "./types";
import type { CaseSnapshotData } from "./inputs";
import { analyzeHearings, type DelayReason } from "@/lib/legal/delay-analysis";
import type { ECourtHearing } from "@/lib/providers/ecourts/types";

const REASON_LABEL: Record<DelayReason, string> = {
  "time sought": "Adjourned on a request for time",
  "counsel unavailable": "Counsel unavailable",
  "evidence unavailable": "Evidence / documents awaited",
  "party absent": "A party absent",
  "court unavailable": "Court / judge unavailable",
  "administrative reason": "Administrative reason",
  "substantive hearing": "Substantive progress",
  "reason unclear": "Reason not clearly recorded",
};

function bucketStatement(reason: DelayReason, count: number): string {
  const n = `${count} listing${count === 1 ? "" : "s"}`;
  switch (reason) {
    case "time sought":
      return `${n} were adjourned on a request for time.`;
    case "counsel unavailable":
      return `${n} record counsel or an advocate as unavailable.`;
    case "evidence unavailable":
      return `${n} note that evidence or documents were awaited.`;
    case "party absent":
      return `${n} record a party as absent.`;
    case "court unavailable":
      return `${n} could not proceed due to court or judge unavailability.`;
    case "administrative reason":
      return `${n} were affected by administrative reasons (roster, board or not reached).`;
    case "substantive hearing":
      return `${n} recorded substantive progress.`;
    case "reason unclear":
      return `${n} have no clearly recorded reason.`;
  }
}

function toECourtHearing(h: CaseSnapshotData["history"][number]): ECourtHearing {
  return {
    hearingDate: h.hearingDate,
    purpose: h.purpose ?? "",
    result: h.result ?? "",
    orderSummary: h.orderSummary ?? "",
  };
}

export function buildDelayPattern(snapshot: CaseSnapshotData): DelayPatternMap {
  const history = snapshot.history.map(toECourtHearing);
  const analysis = analyzeHearings(history);

  const byReason = new Map<DelayReason, { count: number; dates: string[] }>();
  for (const h of analysis.hearings) {
    const entry = byReason.get(h.reason) ?? { count: 0, dates: [] };
    entry.count += 1;
    if (h.hearingDate) entry.dates.push(h.hearingDate);
    byReason.set(h.reason, entry);
  }

  const buckets: DelayPatternBucket[] = [...byReason.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([reason, { count, dates }]) => ({
      reason: REASON_LABEL[reason],
      count,
      statement: bucketStatement(reason, count),
      hearingDates: dates,
    }));

  const source: SourceRef = {
    kind: "ecourts",
    label: "eCourts — Case history",
    field: "history",
    recordId: snapshot.cnr,
    retrievedAt: snapshot.capturedAt,
  };

  const parts: string[] = [
    `Records show ${analysis.total} listing${analysis.total === 1 ? "" : "s"}.`,
  ];
  if (analysis.total > 0) {
    parts.push(
      `${analysis.postponed} did not result in substantive progress and ${analysis.substantive} recorded progress.`
    );
  }
  if (analysis.averageGap !== null) {
    parts.push(`Average gap between listings is about ${analysis.averageGap} days.`);
  }
  if (analysis.longestGap !== null) {
    parts.push(`The longest gap is about ${analysis.longestGap} days.`);
  }

  return {
    totalHearings: analysis.total,
    postponed: analysis.postponed,
    substantive: analysis.substantive,
    averageGapDays: analysis.averageGap,
    longestGapDays: analysis.longestGap,
    buckets,
    summary: parts.join(" "),
    source,
  };
}

/**
 * Cost of Delay — multiplies user-provided per-appearance figures by the number
 * of recorded appearances. Returns null when the user has supplied no figures,
 * so the UI never shows an estimate built on assumptions.
 */
export function computeCostOfDelay(
  input: CostOfDelayInput,
  appearances: number
): CostOfDelay | null {
  const daily = input.dailyIncomeLost ?? 0;
  const travel = input.travelCostPerAppearance ?? 0;
  const other = input.otherCostPerAppearance ?? 0;
  if (daily <= 0 && travel <= 0 && other <= 0) return null;

  const estimatedLostIncome = Math.round(daily * appearances);
  const estimatedTravel = Math.round(travel * appearances);
  const estimatedOther = Math.round(other * appearances);

  return {
    appearances,
    estimatedWorkingDaysAffected: appearances,
    estimatedLostIncome,
    estimatedTravel,
    estimatedOther,
    total: estimatedLostIncome + estimatedTravel + estimatedOther,
    currency: input.currency ?? "INR",
    disclaimer:
      "Estimate based only on the figures you entered and the number of recorded appearances (one working day each). It is an illustration of personal cost, not a calculation of legally recoverable damages.",
  };
}
