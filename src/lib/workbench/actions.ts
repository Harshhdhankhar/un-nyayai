/* =========================================================================
 * Smart Action Engine — actions derived from real Matter state.
 *
 * Every action is generated because a concrete, checkable condition holds and
 * includes a plain-language "why this action appears". No fabricated to-dos.
 * ========================================================================= */

import type { MatterBundle } from "@/lib/intelligence/inputs";
import type { CourtDirection, Contradiction, MissingItem } from "@/lib/intelligence/types";
import type { Chronology, Issue } from "./types";
import type { SmartAction } from "./types";

export interface ActionContext {
  bundle: MatterBundle;
  directions: CourtDirection[];
  missing: MissingItem[];
  contradictions: Contradiction[];
  chronology: Chronology;
  issues: Issue[];
  upcomingHearing: string | null;
}

export function buildSmartActions(ctx: ActionContext): SmartAction[] {
  const { bundle, directions, missing, contradictions, chronology, issues, upcomingHearing } = ctx;
  const actions: SmartAction[] = [];
  let seq = 0;
  const push = (
    title: string,
    why: string,
    type: SmartAction["type"],
    sources: SmartAction["sources"],
    href?: string
  ) => {
    seq += 1;
    actions.push({ id: `act-${seq}`, title, why, type, sources, href });
  };

  // Court direction requires a reply / action.
  for (const d of directions.filter((x) => x.compliance === "pending").slice(0, 2)) {
    push(
      "Review court reply requirement",
      `A court direction appears pending: “${d.text}”.`,
      "reply",
      [d.source],
      `/app/matters/${bundle.id}/case`
    );
  }

  // Missing evidence / unsupported claims.
  const needEvidence = issues.some((i) => i.coverage === "MISSING_INFORMATION");
  if (needEvidence || bundle.facts.some((f) => f.kind === "missing")) {
    push(
      "Add evidence for unsupported claims",
      "One or more issues currently lack corroborating evidence.",
      "evidence",
      [missing[0]?.sources[0] ?? { kind: "system", label: "Derived from matter state" }],
      `/app/matters/${bundle.id}/evidence`
    );
  }

  // Upcoming hearing.
  if (upcomingHearing) {
    push(
      `Prepare hearing brief for ${upcomingHearing}`,
      "There is an upcoming hearing on the court record.",
      "hearing",
      [{ kind: "ecourts", label: "eCourts — Case record", field: "next_hearing_date" }],
      `/app/matters/${bundle.id}/hearings`
    );
  }

  // Legal issue needs research.
  const needResearch = issues.some((i) => i.coverage === "NEEDS_RESEARCH");
  if (needResearch) {
    push(
      "Research authorities for open legal issues",
      "At least one legal issue has no verified authority linked yet.",
      "research",
      [{ kind: "system", label: "Derived from issue coverage" }],
      `/app/matters/${bundle.id}/research`
    );
  }

  // Contradictions unresolved.
  if (contradictions.length > 0) {
    push(
      "Resolve conflicting values",
      `${contradictions.length} contradiction(s) were detected and remain unresolved.`,
      "verify",
      contradictions.flatMap((c) => c.values.map((v) => v.source)),
      `/app/matters/${bundle.id}/workbench`
    );
  }

  // Evidence needing verification.
  const needsVerification = bundle.evidence.filter((e) => e.status === "needs_verification");
  if (needsVerification.length > 0) {
    push(
      "Verify flagged evidence",
      `${needsVerification.length} evidence item(s) are present but not yet verified.`,
      "verify",
      needsVerification.map((e) => ({ kind: "user" as const, label: `Evidence: ${e.title}`, recordId: e.id })),
      `/app/matters/${bundle.id}/evidence`
    );
  }

  // Missing dates in chronology.
  const missingDates = chronology.findings.filter((f) => f.kind === "missing_date");
  if (missingDates.length > 0) {
    push(
      "Add dates to the chronology",
      `${missingDates.length} finding(s) about events without a recorded date.`,
      "task",
      missingDates.flatMap((f) => f.sources),
      `/app/matters/${bundle.id}/timeline`
    );
  }

  // New settlement uploaded → second opinion.
  const recentSettlement = bundle.documents.some((d) => /settlement/i.test(`${d.name} ${d.summary ?? ""}`));
  if (recentSettlement) {
    push(
      "Run a second opinion on the settlement",
      "A document matching “settlement” is in this matter.",
      "settlement",
      [{ kind: "document", label: "Settlement document" }],
      `/app/matters/${bundle.id}/second-opinion`
    );
  }

  return actions;
}
