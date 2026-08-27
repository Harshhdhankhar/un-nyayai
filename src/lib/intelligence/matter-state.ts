/* =========================================================================
 * Matter State Machine — high-level, deterministic product state.
 *
 * Deliberately NOT a single universal legal sequence: NyayPath remains the
 * domain-specific roadmap. This state answers "where does the USER stand in
 * using NyayAI right now" so the product can prioritise what information is
 * relevant, what actions to show, and what intelligence to refresh.
 *
 * Every transition is a plain function of the recorded Matter bundle + cached
 * case snapshot. No LLM, no fabricated legal conclusions — just a label with a
 * human-readable reason you can show behind "why this?".
 * ========================================================================= */

import type { MatterBundle, CaseSnapshotData } from "./inputs";

export type MatterState =
  | "INTAKE"
  | "INFORMATION_COLLECTION"
  | "PRE_ACTION"
  | "ACTION_TAKEN"
  | "PROCEEDING_ACTIVE"
  | "HEARING_PREPARATION"
  | "AWAITING_COURT_ACTIVITY"
  | "POST_HEARING"
  | "RESOLUTION_REVIEW"
  | "CLOSED";

export const STATE_LABELS: Record<MatterState, string> = {
  INTAKE: "Just started",
  INFORMATION_COLLECTION: "Gathering information",
  PRE_ACTION: "Preparing to act",
  ACTION_TAKEN: "Action in progress",
  PROCEEDING_ACTIVE: "Case in court",
  HEARING_PREPARATION: "Preparing for a hearing",
  AWAITING_COURT_ACTIVITY: "Awaiting court activity",
  POST_HEARING: "After a hearing",
  RESOLUTION_REVIEW: "Reviewing a settlement",
  CLOSED: "Closed",
};

/** How many days ahead a hearing is considered "approaching" for prep. */
export const HEARING_PREP_HORIZON_DAYS = 21;

export interface MatterStateDerivation {
  state: MatterState;
  label: string;
  reason: string;
  /** What NyayAI should emphasise in this state. */
  focus: string[];
  /** ISO date of the relevant upcoming hearing, when state is hearing prep. */
  nextHearingDate: string | null;
}

function daysUntil(iso: string, todayISO: string): number {
  const d = new Date(`${iso}T00:00:00Z`).getTime();
  const t = new Date(`${todayISO}T00:00:00Z`).getTime();
  return Math.round((d - t) / 86_400_000);
}

function hasSettlement(bundle: MatterBundle): boolean {
  return (
    bundle.evidence.some((e) => /settlement|offer|compromise/i.test(`${e.title} ${e.description ?? ""}`)) ||
    bundle.documents.some((d) => /settlement|offer|compromise/i.test(`${d.name} ${d.summary ?? ""}`)) ||
    bundle.events.some((ev) => /settlement|offer|compromise/i.test(ev.title))
  );
}

export function deriveMatterState(
  bundle: MatterBundle,
  snapshot: CaseSnapshotData | null,
  now: Date = new Date()
): MatterStateDerivation {
  const today = now.toISOString().slice(0, 10);

  // CLOSED — clear terminal signals only, never inferred from silence.
  const disposed = snapshot?.caseStatus === "disposed";
  const explicitlyClosed = /closed|disposed|settled|withdrawn|compromised/i.test(
    `${bundle.status} ${bundle.nextAction ?? ""}`
  );
  if (disposed || explicitlyClosed) {
    return {
      state: "CLOSED",
      label: STATE_LABELS.CLOSED,
      reason: disposed
        ? "The court record marks this case as disposed."
        : "This matter is recorded as closed.",
      focus: ["Whether anything is still owed", "Documenting the outcome"],
      nextHearingDate: null,
    };
  }

  // RESOLUTION_REVIEW — a settlement/offer is present but not yet final.
  if (hasSettlement(bundle) && !explicitlyClosed) {
    return {
      state: "RESOLUTION_REVIEW",
      label: STATE_LABELS.RESOLUTION_REVIEW,
      reason: "A settlement or offer is recorded on this matter.",
      focus: ["Trade-offs of the offer", "What is conditional (e.g. withdrawal)"],
      nextHearingDate: snapshot?.nextHearingDate ?? null,
    };
  }

  // Court-connected states.
  if (snapshot && snapshot.caseStatus !== "disposed") {
    const next = snapshot.nextHearingDate;
    if (next && next >= today) {
      const days = daysUntil(next, today);
      if (days <= HEARING_PREP_HORIZON_DAYS) {
        return {
          state: "HEARING_PREPARATION",
          label: STATE_LABELS.HEARING_PREPARATION,
          reason: `A hearing is recorded on ${next} (${days} day${days === 1 ? "" : "s"} away).`,
          focus: ["Hearing readiness", "Pending court directions", "Latest order"],
          nextHearingDate: next,
        };
      }
      return {
        state: "PROCEEDING_ACTIVE",
        label: STATE_LABELS.PROCEEDING_ACTIVE,
        reason: "The case is pending in court.",
        focus: ["Case progression", "Deadlines", "Upcoming listing"],
        nextHearingDate: next,
      };
    }
    if (next && next < today) {
      return {
        state: "POST_HEARING",
        label: STATE_LABELS.POST_HEARING,
        reason: `The last recorded hearing date (${next}) has passed and no newer one is recorded yet.`,
        focus: ["What happened at the last hearing", "Confirming the next date"],
        nextHearingDate: null,
      };
    }
    return {
      state: "AWAITING_COURT_ACTIVITY",
      label: STATE_LABELS.AWAITING_COURT_ACTIVITY,
      reason: "The case is in court but no next hearing date is recorded.",
      focus: ["Recent orders", "Pending directions", "Refreshing court data"],
      nextHearingDate: null,
    };
  }

  // Pre-court lifecycle.
  const hasFacts = bundle.facts.some((f) => f.kind !== "missing");
  const hasAction = Boolean(bundle.nextAction && bundle.nextAction.trim());
  if (!hasFacts) {
    return {
      state: "INTAKE",
      label: STATE_LABELS.INTAKE,
      reason: "Little has been recorded about this matter yet.",
      focus: ["What happened", "Who is involved", "What the user wants"],
      nextHearingDate: null,
    };
  }
  if (hasAction) {
    return {
      state: "ACTION_TAKEN",
      label: STATE_LABELS.ACTION_TAKEN,
      reason: "A next action is recorded for this matter.",
      focus: ["Following the recorded next action", "Gathering supporting evidence"],
      nextHearingDate: null,
    };
  }
  const missingInfo =
    bundle.facts.filter((f) => f.kind === "missing").length +
    bundle.evidence.filter((e) => e.status === "missing" || e.status === "needs_verification").length;
  return {
    state: missingInfo > 0 ? "INFORMATION_COLLECTION" : "PRE_ACTION",
    label: missingInfo > 0 ? STATE_LABELS.INFORMATION_COLLECTION : STATE_LABELS.PRE_ACTION,
    reason: missingInfo > 0
      ? "Some important facts or evidence are still unrecorded."
      : "The situation is understood but no next action is set yet.",
    focus: missingInfo > 0
      ? ["Filling the key gaps", "Collecting documents"]
      : ["Deciding a next action"],
    nextHearingDate: null,
  };
}