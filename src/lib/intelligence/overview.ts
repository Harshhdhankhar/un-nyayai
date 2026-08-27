import "server-only";
import { getMatterDetail } from "@/lib/matters/service";
import { getLatestPair } from "@/lib/intelligence/case-store";
import { diffSnapshots } from "@/lib/intelligence/snapshots";
import { detectContradictions } from "@/lib/intelligence/contradictions";
import { analyseCourtOrders } from "@/lib/intelligence/court-orders";
import { detectMissing } from "@/lib/intelligence/missing";
import { buildClientUpdate } from "@/lib/intelligence/client-update";
import { assembleOrderTexts } from "@/lib/workbench/case-reasoning";
import { buildIssueTree } from "@/lib/workbench/issues";
import { buildChronology } from "@/lib/workbench/chronology";
import { buildSmartActions } from "@/lib/workbench/actions";
import { deriveMatterState, type MatterStateDerivation } from "@/lib/intelligence/matter-state";
import type { MatterBundle } from "@/lib/intelligence/inputs";
import type { ClientUpdate, Contradiction, SnapshotChange } from "@/lib/intelligence/types";
import type { SmartAction } from "@/lib/workbench/types";

/* =========================================================================
 * Matter Overview intelligence — lightweight, non-duplicative.
 *
 * Surfaces only what the Overview command center needs, WITHOUT running the
 * full case-reasoning map (that lives on the Workbench tab). Deterministic and
 * cached: one ownership-enforced DB read plus the cached eCourts snapshot.
 * No live external API and no LLM on matter open.
 * ========================================================================= */

export interface OverviewIntelligence {
  /** What changed since the previous snapshot — "since your last check". */
  changes: SnapshotChange[];
  /** Copy/exportable plain-language client update. */
  clientUpdate: ClientUpdate | null;
  /** Detected contradictions needing attention. */
  contradictions: Contradiction[];
  /** Number of pending court directions. */
  pendingDirectionCount: number;
  /** Highest-priority state-driven next action, if any. */
  topAction: SmartAction | null;
  /** High-level product state derived deterministically. */
  matterState: MatterStateDerivation;
}

export async function buildOverviewIntelligence(
  userId: string,
  matterId: string
): Promise<OverviewIntelligence | null> {
  const detail = await getMatterDetail(userId, matterId);
  if (!detail) return null;
  const bundle = detail as unknown as MatterBundle;

  const { current, previous } = await getLatestPair(matterId);
  const changes = current ? diffSnapshots(previous, current) : [];
  const contradictions = detectContradictions(bundle, current);
  const directions = analyseCourtOrders(assembleOrderTexts(bundle, current), bundle.tasks);
  const missing = detectMissing(bundle);

  const clientUpdate = buildClientUpdate({
    matterTitle: bundle.title,
    snapshot: current,
    changes,
    directions,
    missing,
  });

  const issues = buildIssueTree(bundle, { contradictions }).issues;
  const chronology = buildChronology(bundle, current);
  const actions = buildSmartActions({
    bundle,
    directions,
    missing,
    contradictions,
    chronology,
    issues,
    upcomingHearing: current?.nextHearingDate ?? null,
  });

  return {
    changes,
    clientUpdate,
    contradictions,
    pendingDirectionCount: directions.filter((d) => d.compliance === "pending").length,
    topAction: actions[0] ?? null,
    matterState: deriveMatterState(bundle, current),
  };
}
