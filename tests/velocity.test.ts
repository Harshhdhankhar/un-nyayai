import { describe, it, expect } from "vitest";
import { buildCaseVelocity, buildProceduralPatterns } from "@/lib/intelligence/velocity";
import type { CaseSnapshotData } from "@/lib/intelligence/inputs";

function snap(history: CaseSnapshotData["history"], nextHearingDate: string | null = null): CaseSnapshotData {
  return {
    cnr: "DLND010000012024",
    caseStatus: "pending",
    stage: null,
    nextHearingDate,
    petitioner: "A",
    respondent: "B",
    orderCount: 0,
    history,
    orders: [],
    capturedAt: "2026-08-01T00:00:00Z",
    mode: "live",
  };
}

describe("buildCaseVelocity", () => {
  it("collapses consecutive same-label segments", () => {
    const v = buildCaseVelocity(
      snap([
        { hearingDate: "2026-01-10", purpose: "Evidence", result: "Adjourned" },
        { hearingDate: "2026-02-10", purpose: "Evidence", result: "Adjourned" },
        { hearingDate: "2026-03-10", purpose: "Arguments", result: "Part heard" },
      ])
    );
    const labels = v.segments.map((s) => s.label);
    expect(labels).toContain("Adjournment-heavy");
    expect(labels).toContain("Substantive Hearing");
    expect(labels[0]).toBe("Active Progress");
    // collapse should merge the two evidence adjournments
    const heavy = v.segments.find((s) => s.label === "Adjournment-heavy");
    expect(heavy!.count).toBe(2);
  });

  it("adds an awaiting-next-listing segment when no next date", () => {
    const v = buildCaseVelocity(snap([{ hearingDate: "2026-01-10", purpose: "Hearing", result: "" }]));
    expect(v.segments.some((s) => s.label === "Awaiting Next Listing")).toBe(true);
  });

  it("reports no hearings gracefully", () => {
    const v = buildCaseVelocity(snap([]));
    expect(v.segments[0].label).toBe("Awaiting Next Listing");
  });
});

describe("buildProceduralPatterns", () => {
  it("flags evidence-stage stagnation across 3+ hearings", () => {
    const p = buildProceduralPatterns(
      snap([
        { hearingDate: "2026-01-10", purpose: "Recording of evidence", result: "Adjourned" },
        { hearingDate: "2026-02-10", purpose: "Evidence", result: "Adjourned" },
        { hearingDate: "2026-03-10", purpose: "Evidence", result: "Adjourned" },
      ])
    );
    expect(p.some((x) => x.label === "Evidence-stage stagnation")).toBe(true);
  });

  it("flags repeated requests for time", () => {
    const p = buildProceduralPatterns(
      snap([
        { hearingDate: "2026-01-10", purpose: "Hearing", result: "Time sought" },
        { hearingDate: "2026-02-10", purpose: "Hearing", result: "Time sought" },
        { hearingDate: "2026-03-10", purpose: "Hearing", result: "Time sought" },
      ])
    );
    expect(p.some((x) => x.label === "Repeated requests for time")).toBe(true);
  });

  it("does not flag a normal progressing case", () => {
    const p = buildProceduralPatterns(
      snap([
        { hearingDate: "2026-01-10", purpose: "Arguments", result: "Part heard" },
        { hearingDate: "2026-02-10", purpose: "Arguments", result: "Order reserved" },
      ])
    );
    expect(p.length).toBe(0);
  });

  it("labels observations as factual, not misconduct", () => {
    const p = buildProceduralPatterns(
      snap([
        { hearingDate: "2026-01-10", purpose: "Evidence", result: "Adjourned" },
        { hearingDate: "2026-02-10", purpose: "Evidence", result: "Adjourned" },
        { hearingDate: "2026-03-10", purpose: "Evidence", result: "Adjourned" },
      ])
    );
    for (const pattern of p) {
      expect(pattern.why.toLowerCase()).not.toContain("misconduct");
    }
  });
});