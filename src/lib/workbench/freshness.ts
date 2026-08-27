/* =========================================================================
 * Research Freshness — flags how long ago a saved authority was retrieved.
 *
 * Purely deterministic. A stale flag means "re-check whether the law is
 * still current" — it is NOT a statement that the source is wrong. Sources
 * without a retrieval timestamp are reported as unknown, not stale.
 * ========================================================================= */

export type FreshnessState = "fresh" | "stale" | "unknown";

export const STALE_AFTER_DAYS = 120;

export interface Freshness {
  state: FreshnessState;
  ageDays: number | null;
  retrievedAt: Date | null;
}

export function sourceFreshness(
  retrievedAt: Date | string | null | undefined,
  now: Date = new Date()
): Freshness {
  if (!retrievedAt) return { state: "unknown", ageDays: null, retrievedAt: null };

  const date = retrievedAt instanceof Date ? retrievedAt : new Date(retrievedAt);
  if (Number.isNaN(date.getTime())) return { state: "unknown", ageDays: null, retrievedAt: null };

  const ageMs = now.getTime() - date.getTime();
  const ageDays = Math.max(0, Math.floor(ageMs / 86_400_000));
  return {
    state: ageDays > STALE_AFTER_DAYS ? "stale" : "fresh",
    ageDays,
    retrievedAt: date,
  };
}

/** Count of stale authorities across a set of sources. */
export function countStaleSources(
  sources: Array<{ retrievedAt?: Date | string | null }>,
  now: Date = new Date()
): number {
  return sources.reduce(
    (n, s) => n + (sourceFreshness(s.retrievedAt, now).state === "stale" ? 1 : 0),
    0
  );
}

/** Whole days between an ISO timestamp and now (never negative). */
export function daysSince(iso: string, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000));
}