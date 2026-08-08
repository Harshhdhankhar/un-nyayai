import "server-only";

/* =========================================================================
 * Matter Readiness Score — a measure of how prepared a matter is for the
 * next step. Explicitly NOT a prediction of legal success.
 * ========================================================================= */

export interface ReadinessComponents {
  factsCompleteness: number; // 0..20
  documentsAvailable: number; // 0..20
  timelineCompleteness: number; // 0..15
  legalSourceVerification: number; // 0..15
  nextActionIdentified: number; // 0..15
  missingEvidenceAddressed: number; // 0..10
  deadlineInformation: number; // 0..5
  total: number; // 0..100
}

export interface ReadinessInput {
  factCount: number;
  missingFactCount: number;
  documentCount: number;
  eventCount: number;
  sourceVerifiedCount: number;
  sourceCount: number;
  hasNextAction: boolean;
  missingEvidenceCount: number;
  availableEvidenceCount: number;
  hasDeadlineInfo: boolean;
}

export function computeReadiness(input: ReadinessInput): ReadinessComponents {
  const factsCompleteness = clamp(
    20 * (input.factCount / Math.max(1, input.factCount + input.missingFactCount))
  );

  const documentsAvailable = clamp(20 * Math.min(1, input.documentCount / 4));

  const timelineCompleteness = clamp(15 * Math.min(1, input.eventCount / 6));

  const legalSourceVerification =
    input.sourceCount === 0
      ? 0
      : clamp(15 * (input.sourceVerifiedCount / input.sourceCount));

  const nextActionIdentified = input.hasNextAction ? 15 : 0;

  const missingEvidenceAddressed =
    input.availableEvidenceCount === 0 && input.missingEvidenceCount === 0
      ? 0
      : clamp(
          10 *
            (input.availableEvidenceCount /
              Math.max(1, input.availableEvidenceCount + input.missingEvidenceCount))
        );

  const deadlineInformation = input.hasDeadlineInfo ? 5 : 0;

  const total = clamp(
    factsCompleteness +
      documentsAvailable +
      timelineCompleteness +
      legalSourceVerification +
      nextActionIdentified +
      missingEvidenceAddressed +
      deadlineInformation
  );

  return {
    factsCompleteness: round(factsCompleteness),
    documentsAvailable: round(documentsAvailable),
    timelineCompleteness: round(timelineCompleteness),
    legalSourceVerification: round(legalSourceVerification),
    nextActionIdentified: round(nextActionIdentified),
    missingEvidenceAddressed: round(missingEvidenceAddressed),
    deadlineInformation: round(deadlineInformation),
    total: round(total),
  };
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
