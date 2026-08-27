/* =========================================================================
 * Post-Hearing Update — detect what changed and propose an "UPDATE MATTER?".
 *
 * Detected changes are derived from the cached eCourts snapshot diff. Changes
 * that are derived or uncertain (new order text, a changed date) are marked
 * reviewRequired so the user can confirm before any uncertain extraction is
 * applied to the matter. We never silently overwrite anything.
 * ========================================================================= */

import type { SnapshotChange } from "@/lib/intelligence/types";
import type { CaseSnapshotData } from "@/lib/intelligence/inputs";
import type { PostHearingChange, PostHearingUpdate } from "./types";

function mapKind(kind: SnapshotChange["kind"]): PostHearingChange["kind"] {
  switch (kind) {
    case "new_order": return "new_order";
    case "new_listing": return "new_hearing";
    case "next_hearing_changed": return "next_date_changed";
    case "stage_changed": return "stage_changed";
    case "status_changed": return "status_changed";
    case "party_updated": return "party_updated";
  }
}

function reviewRequired(kind: SnapshotChange["kind"]): boolean {
  // New order / next-date changes are the ones where an uncertain extraction
  // could be misapplied — require review.
  return kind === "new_order" || kind === "next_hearing_changed" || kind === "new_listing";
}

export function buildPostHearingUpdate(input: {
  snapshot: CaseSnapshotData | null;
  changes: SnapshotChange[];
}): PostHearingUpdate {
  const { changes } = input;
  if (changes.length === 0) {
    return { hasChanges: false, changes: [], proposedEvents: [] };
  }

  const mapped: PostHearingChange[] = changes.map((c, i) => ({
    id: `phe-${i}`,
    kind: mapKind(c.kind),
    label: c.label,
    before: c.before,
    after: c.after,
    source: c.source,
    reviewRequired: reviewRequired(c.kind),
  }));

  const proposedEvents: PostHearingUpdate["proposedEvents"] = [];
  for (const c of changes) {
    if (c.kind === "new_order") {
      proposedEvents.push({
        title: `New order on record${c.after ? `: ${c.after}` : ""}`,
        description: "Detected from the court record; review the order text before confirming.",
        source: "ecourts",
      });
    } else if (c.kind === "new_listing" || c.kind === "next_hearing_changed") {
      proposedEvents.push({
        eventDate: c.after ?? undefined,
        title: `Next hearing scheduled${c.after ? ` on ${c.after}` : ""}`,
        source: "ecourts",
      });
    } else if (c.kind === "stage_changed") {
      proposedEvents.push({
        title: `Stage changed${c.after ? ` to ${c.after}` : ""}`,
        source: "ecourts",
      });
    }
  }

  return { hasChanges: true, changes: mapped, proposedEvents };
}
