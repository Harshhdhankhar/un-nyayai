import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { caseSnapshots } from "@/lib/db/schema";
import { lookupCaseByCnr } from "@/lib/providers/ecourts";
import type { ECourtCaseDetail } from "@/lib/providers/ecourts/types";
import type { CaseSnapshotData } from "./inputs";
import { logger } from "@/lib/logger";

/* =========================================================================
 * Case snapshot store (server-only).
 *
 * Persists point-in-time eCourts captures and reads them back for Change
 * Intelligence. Opening a matter reads the latest cached snapshot; it never
 * triggers a live eCourts call. Refresh is an explicit, user-initiated action
 * (Section 24: refresh external data intentionally, cache responsibly).
 * ========================================================================= */

/** Map a live/demo eCourts detail into the serializable snapshot shape. */
export function detailToSnapshot(
  cnr: string,
  mode: "live" | "demo",
  detail: ECourtCaseDetail,
  capturedAt: string
): CaseSnapshotData {
  return {
    cnr,
    mode,
    caseStatus: detail.record.caseStatus ?? null,
    stage: detail.record.stage ?? null,
    nextHearingDate: detail.record.nextHearingDate ?? null,
    petitioner: detail.record.petitioner ?? null,
    respondent: detail.record.respondent ?? null,
    orderCount: detail.orderCount ?? detail.orders.length,
    history: detail.history.map((h) => ({
      hearingDate: h.hearingDate,
      purpose: h.purpose,
      result: h.result,
      orderSummary: h.orderSummary,
    })),
    orders: detail.orders.map((o) => ({
      orderDate: o.orderDate,
      summary: o.summary,
      orderType: o.orderType,
    })),
    capturedAt,
  };
}

/** Capture a fresh snapshot for a matter (explicit refresh). */
export async function captureSnapshot(
  matterId: string,
  cnr: string
): Promise<{ snapshot: CaseSnapshotData; mode: "live" | "demo" }> {
  const { caseData, mode } = await lookupCaseByCnr(cnr);
  const capturedAt = new Date().toISOString();
  const snapshot = detailToSnapshot(cnr, mode, caseData, capturedAt);
  await db.insert(caseSnapshots).values({
    matterId,
    cnr,
    mode,
    caseStatus: snapshot.caseStatus,
    stage: snapshot.stage,
    nextHearingDate: snapshot.nextHearingDate,
    petitioner: snapshot.petitioner,
    respondent: snapshot.respondent,
    orderCount: snapshot.orderCount,
    data: caseData as unknown,
  });
  logger.info("case_snapshot_captured", { matterId, cnr, mode });
  return { snapshot, mode };
}

function rowToSnapshot(row: typeof caseSnapshots.$inferSelect): CaseSnapshotData {
  const detail = (row.data ?? {}) as Partial<ECourtCaseDetail>;
  return {
    cnr: row.cnr,
    mode: (row.mode as "live" | "demo") ?? "demo",
    caseStatus: row.caseStatus,
    stage: row.stage,
    nextHearingDate: row.nextHearingDate,
    petitioner: row.petitioner,
    respondent: row.respondent,
    orderCount: row.orderCount,
    history: (detail.history ?? []).map((h) => ({
      hearingDate: h.hearingDate,
      purpose: h.purpose,
      result: h.result,
      orderSummary: h.orderSummary,
    })),
    orders: (detail.orders ?? []).map((o) => ({
      orderDate: o.orderDate,
      summary: o.summary,
      orderType: o.orderType,
    })),
    capturedAt: row.capturedAt.toISOString(),
  };
}

/** Read the most recent snapshots (newest first) for a matter. */
export async function getSnapshots(matterId: string, limit = 2): Promise<CaseSnapshotData[]> {
  const rows = await db
    .select()
    .from(caseSnapshots)
    .where(eq(caseSnapshots.matterId, matterId))
    .orderBy(desc(caseSnapshots.capturedAt))
    .limit(limit);
  return rows.map(rowToSnapshot);
}

/** Latest snapshot plus the one before it (for diffing), or nulls if absent. */
export async function getLatestPair(
  matterId: string
): Promise<{ current: CaseSnapshotData | null; previous: CaseSnapshotData | null }> {
  const rows = await getSnapshots(matterId, 2);
  return { current: rows[0] ?? null, previous: rows[1] ?? null };
}

/** Whether a matter has any snapshot yet. */
export async function hasSnapshot(matterId: string): Promise<boolean> {
  const rows = await db
    .select({ id: caseSnapshots.id })
    .from(caseSnapshots)
    .where(eq(caseSnapshots.matterId, matterId))
    .limit(1);
  return rows.length > 0;
}

export interface CachedCaseDetail {
  detail: ECourtCaseDetail;
  mode: "live" | "demo";
  capturedAt: string;
}

/**
 * The latest stored eCourts detail for a matter, without making any live
 * provider call. Used to render the Case tab and Delay Analysis from the
 * cache; refresh is always an explicit action. Returns null when the matter
 * has not been connected to eCourts yet.
 */
export async function getLatestDetail(matterId: string): Promise<CachedCaseDetail | null> {
  const rows = await db
    .select({ data: caseSnapshots.data, mode: caseSnapshots.mode, capturedAt: caseSnapshots.capturedAt })
    .from(caseSnapshots)
    .where(eq(caseSnapshots.matterId, matterId))
    .orderBy(desc(caseSnapshots.capturedAt))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const detail = (row.data ?? {}) as ECourtCaseDetail;
  if (!detail.record) return null;
  return { detail, mode: (row.mode as "live" | "demo") ?? "demo", capturedAt: row.capturedAt.toISOString() };
}
