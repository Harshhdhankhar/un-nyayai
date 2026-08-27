import "server-only";
import { getMatterDetail } from "@/lib/matters/service";
import { getLatestDetail } from "@/lib/intelligence/case-store";
import { detailToSnapshot } from "@/lib/intelligence/case-store";
import { analyseCourtOrders } from "@/lib/intelligence/court-orders";
import { detectContradictions } from "@/lib/intelligence/contradictions";
import { diffSnapshots } from "@/lib/intelligence/snapshots";
import { buildPreHearingCheck } from "@/lib/workbench/prehearing";
import { assembleOrderTexts } from "@/lib/workbench/case-reasoning";
import type { MatterBundle } from "@/lib/intelligence/inputs";
import type { CourtDirection } from "@/lib/intelligence/types";
import type { PreHearingItem } from "@/lib/workbench/types";

/* =========================================================================
 * Hearing Prep intelligence — lightweight, cached, no live provider call.
 *
 * Supplies the Hearing Brief with the real next-listing from the cached
 * eCourts record, pending court directions and the honest pre-hearing
 * readiness checklist. Deterministic analyzers only; the official record is
 * refreshed only by an explicit user action.
 * ========================================================================= */

export interface HearingPrep {
  cnr: string | null;
  mode: "live" | "demo" | null;
  capturedAt: string | null;
  nextHearingDate: string | null;
  hasSnapshot: boolean;
  pendingDirections: CourtDirection[];
  readiness: { items: PreHearingItem[]; overall: string | null };
}

export async function buildHearingPrep(
  userId: string,
  matterId: string
): Promise<HearingPrep | null> {
  const detail = await getMatterDetail(userId, matterId);
  if (!detail) return null;
  const bundle = detail as unknown as MatterBundle;

  const cached = await getLatestDetail(matterId);
  const snapshot = cached ? detailToSnapshot(cached.detail.record.cnr, cached.mode, cached.detail, cached.capturedAt) : null;
  const changes = snapshot ? diffSnapshots(null, snapshot) : [];
  const contradictions = detectContradictions(bundle, snapshot);
  const directions = analyseCourtOrders(assembleOrderTexts(bundle, snapshot), bundle.tasks);
  const preHearing = buildPreHearingCheck({
    bundle,
    directions,
    contradictions,
    changes,
    hasSnapshot: Boolean(snapshot),
  });

  return {
    cnr: bundle.cnr,
    mode: cached?.mode ?? null,
    capturedAt: cached?.capturedAt ?? null,
    nextHearingDate: snapshot?.nextHearingDate ?? null,
    hasSnapshot: Boolean(snapshot),
    pendingDirections: directions.filter((d) => d.compliance === "pending"),
    readiness: { items: preHearing.items, overall: preHearing.overall },
  };
}
