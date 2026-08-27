import { describe, it, expect } from "vitest";
import { buildMatterStatus, type MatterStatusInput } from "@/lib/intelligence/matter-status";

function base(over: Partial<MatterStatusInput> = {}): MatterStatusInput {
  return {
    factCount: 3,
    missingFactCount: 0,
    evidenceAvailable: 2,
    evidenceMissing: 0,
    hasCnr: true,
    hasSnapshot: true,
    snapshotAgeDays: 0,
    staleSnapshot: false,
    researchCount: 2,
    staleSourceCount: 0,
    verifiedSourceCount: 1,
    pendingDirectionCount: 0,
    contradictionCount: 0,
    nextHearingDate: null,
    hasDeadline: true,
    ...over,
  };
}

describe("buildMatterStatus", () => {
  it("never produces a numeric score", () => {
    const sections = buildMatterStatus(base());
    expect(JSON.stringify(sections)).not.toMatch(/\d{2,}%/);
    for (const s of sections) {
      expect(["good", "attention", "missing", "needs_refresh"]).toContain(s.status);
    }
  });

  it("reports each of the six sections once", () => {
    const keys = buildMatterStatus(base()).map((s) => s.key);
    expect(keys).toEqual(["facts", "evidence", "court_data", "research", "directions", "upcoming"]);
  });

  it("flags stale court data as needs_refresh", () => {
    const s = buildMatterStatus(base({ staleSnapshot: true, snapshotAgeDays: 130 })).find((x) => x.key === "court_data");
    expect(s?.status).toBe("needs_refresh");
    expect(s?.detail).toContain("130 days");
  });

  it("flags stale sources as needs_refresh", () => {
    const s = buildMatterStatus(base({ staleSourceCount: 2 })).find((x) => x.key === "research");
    expect(s?.status).toBe("needs_refresh");
  });

  it("flags missing evidence", () => {
    const s = buildMatterStatus(base({ evidenceMissing: 2 })).find((x) => x.key === "evidence");
    expect(s?.status).toBe("attention");
  });

  it("reports next hearing when present", () => {
    const s = buildMatterStatus(base({ nextHearingDate: "2026-09-01" })).find((x) => x.key === "upcoming");
    expect(s?.status).toBe("good");
    expect(s?.detail).toContain("2026-09-01");
  });
});