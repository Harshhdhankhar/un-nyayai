/* =========================================================================
 * Missing Information Engine.
 *
 * Surfaces what is absent — and, crucially, WHY it matters for THIS matter.
 * We never assert something is "mandatory" unless it is a verified rule; the
 * default framing is "this is needed because …" tied to concrete matter state.
 * Everything here is derived deterministically from already-recorded data.
 * ========================================================================= */

import type { MissingItem, SourceRef } from "./types";
import type { MatterBundle } from "./inputs";
import { userRef, systemRef } from "./provenance";

export function detectMissing(bundle: MatterBundle): MissingItem[] {
  const out: MissingItem[] = [];
  let seq = 0;
  const add = (title: string, why: string, sources: SourceRef[]) => {
    seq += 1;
    out.push({ id: `miss-${seq}`, title, why, sources });
  };

  // 1) Facts the user explicitly flagged as open questions.
  for (const f of bundle.facts) {
    if (f.kind !== "missing") continue;
    add(
      f.fact,
      "Recorded as an open question on this matter. Resolving it lets NyayAI reason about the facts with more confidence.",
      [userRef("Marked as missing by you", f.id)]
    );
  }

  // 2) Evidence not yet collected.
  for (const e of bundle.evidence) {
    if (e.status === "missing") {
      add(
        e.title,
        e.description?.trim()
          ? e.description
          : "Listed as evidence for this matter but not yet collected. It strengthens the factual record if obtained.",
        [e.provenance ? systemRef(e.title, e.provenance) : userRef(`Evidence: ${e.title}`, e.id)]
      );
    } else if (e.status === "needs_verification") {
      add(
        e.title,
        "Present but not yet verified against a source. Verifying it removes doubt about its reliability.",
        [e.provenance ? systemRef(e.title, e.provenance) : userRef(`Evidence: ${e.title}`, e.id)]
      );
    }
  }

  // 3) Structural gaps — each tied to a concrete, checkable condition.
  const hasCourt = Boolean(bundle.court && bundle.court.trim());
  const hasCnr = Boolean(bundle.cnr && bundle.cnr.trim());
  if (hasCourt && !hasCnr) {
    add(
      "CNR number for the court case",
      "A court is recorded for this matter but no CNR number is saved. The CNR is what lets NyayAI pull official eCourts status, hearings and orders for this case.",
      [systemRef("Derived from matter fields", "court set, cnr empty")]
    );
  }

  const datedEvents = bundle.events.filter((e) => e.eventDate);
  if (datedEvents.length === 0) {
    add(
      "Key dates for this matter",
      "No dated events are recorded. Limitation periods and deadlines are computed from dates — without at least the triggering date, they cannot be checked.",
      [systemRef("Derived from matter timeline", "no dated events")]
    );
  }

  if (bundle.parties.length === 0) {
    add(
      "The parties involved",
      "No parties are recorded. Knowing who is on each side is needed to check the court record and to identify the opposing case.",
      [systemRef("Derived from matter fields", "no parties")]
    );
  }

  return out;
}
