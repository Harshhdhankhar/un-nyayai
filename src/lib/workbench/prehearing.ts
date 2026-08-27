/* =========================================================================
 * Pre-Hearing Check — readiness items, each READY / NEEDS ATTENTION / MISSING.
 *
 * An honest checklist, not a fake readiness percentage. Each item is derived
 * from concrete matter state and linked to its source.
 * ========================================================================= */

import type { MatterBundle } from "@/lib/intelligence/inputs";
import type { CourtDirection, Contradiction, SnapshotChange } from "@/lib/intelligence/types";
import type { CheckStatus, PreHearingCheck, PreHearingItem } from "./types";

export interface PreHearingContext {
  bundle: MatterBundle;
  directions: CourtDirection[];
  contradictions: Contradiction[];
  changes: SnapshotChange[];
  hasSnapshot: boolean;
}

export function buildPreHearingCheck(ctx: PreHearingContext): PreHearingCheck {
  const { bundle, directions, contradictions, changes, hasSnapshot } = ctx;
  const items: PreHearingItem[] = [];
  const push = (check: string, status: CheckStatus, detail: string, sources: PreHearingItem["sources"]) => {
    items.push({ id: `ph-${items.length + 1}`, check, status, detail, sources });
  };
  const ref = (kind: PreHearingItem["sources"][number]["kind"], label: string) => ({ kind, label } as const);

  push(
    "Latest court order reviewed",
    hasSnapshot ? "READY" : "MISSING",
    hasSnapshot ? "A court record is linked and captured." : "No eCourts record is linked to this matter.",
    hasSnapshot ? [ref("ecourts", "eCourts — Case record")] : [ref("system", "Derived from matter state")]
  );

  const pendingDirs = directions.filter((d) => d.compliance === "pending");
  push(
    "Court directions addressed",
    pendingDirs.length ? "NEEDS_ATTENTION" : "READY",
    pendingDirs.length ? `${pendingDirs.length} direction(s) appear pending.` : "No pending court directions detected.",
    pendingDirs.slice(0, 2).map((d) => d.source)
  );

  push(
    "Important documents available",
    bundle.documents.length ? "READY" : "MISSING",
    bundle.documents.length ? `${bundle.documents.length} document(s) uploaded.` : "No documents uploaded.",
    bundle.documents.length ? bundle.documents.slice(0, 3).map((d) => ref("document", d.name)) : [ref("system", "Derived from matter state")]
  );

  const availableEvidence = bundle.evidence.filter((e) => e.status === "available").length;
  push(
    "Important evidence linked",
    availableEvidence > 0 ? "READY" : "NEEDS_ATTENTION",
    availableEvidence > 0 ? `${availableEvidence} evidence item(s) available.` : "No evidence is marked available.",
    availableEvidence > 0 ? [ref("document", "Evidence items")] : [ref("system", "Derived from evidence state")]
  );

  push(
    "Chronology up to date",
    bundle.events.length ? "READY" : "NEEDS_ATTENTION",
    bundle.events.length ? `${bundle.events.length} timeline event(s) recorded.` : "No timeline events recorded.",
    bundle.events.length ? [ref("system", "Matter timeline")] : [ref("system", "Derived from timeline state")]
  );

  push(
    "Relevant research attached",
    bundle.sources.length ? "READY" : "NEEDS_ATTENTION",
    bundle.sources.length ? `${bundle.sources.length} legal source(s) attached.` : "No legal sources attached.",
    bundle.sources.length ? [ref("system", "Legal sources")] : [ref("system", "Derived from sources state")]
  );

  push(
    "Contradictions resolved",
    contradictions.length ? "NEEDS_ATTENTION" : "READY",
    contradictions.length ? `${contradictions.length} contradiction(s) still unresolved.` : "No contradictions detected.",
    contradictions.flatMap((c) => c.values.map((v) => v.source))
  );

  const pendingTasks = bundle.tasks.filter((t) => t.status !== "done");
  push(
    "Pending tasks addressed",
    pendingTasks.length ? "NEEDS_ATTENTION" : "READY",
    pendingTasks.length ? `${pendingTasks.length} open task(s).` : "No open tasks.",
    pendingTasks.slice(0, 3).map((t) => ref("user", `Task: ${t.title}`))
  );

  push(
    "Recent court activity reviewed",
    changes.length ? "NEEDS_ATTENTION" : "READY",
    changes.length ? `${changes.length} change(s) since the last check should be reviewed.` : "No changes since the last check.",
    changes.map((c) => c.source)
  );

  const orderRank: Record<CheckStatus, number> = { READY: 0, NEEDS_ATTENTION: 1, MISSING: 2 };
  const overall: CheckStatus =
    items.reduce<CheckStatus>((worst, it) => (orderRank[it.status] > orderRank[worst] ? it.status : worst), "READY");

  return { items, overall };
}
