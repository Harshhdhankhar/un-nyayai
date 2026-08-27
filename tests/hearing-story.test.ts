import { describe, it, expect } from "vitest";
import { buildCaseJourney } from "@/lib/intelligence/hearing-story";
import type { CaseSnapshotData, MatterBundle } from "@/lib/intelligence/inputs";

const snap: CaseSnapshotData = {
  cnr: "DLND010000012024",
  caseStatus: "pending",
  stage: "evidence",
  nextHearingDate: "2026-09-10",
  petitioner: "Amit",
  respondent: "State",
  orderCount: 1,
  history: [
    { hearingDate: "2026-01-10", purpose: "Service of notice", result: "Notice issued" },
    { hearingDate: "2026-02-14", purpose: "Evidence", result: "Adjourned" },
    { hearingDate: "2026-03-12", purpose: "Evidence", result: "Adjourned" },
    { hearingDate: "2026-04-09", purpose: "Evidence", result: "Adjourned" },
    { hearingDate: "2026-05-11", purpose: "Arguments", result: "Part heard" },
  ],
  orders: [{ orderDate: "2026-05-11", summary: "Reply within two weeks" }],
  capturedAt: "2026-08-01T00:00:00Z",
  mode: "live",
};

const bundle: MatterBundle = {
  id: "m1", title: "t", description: null, matterType: "civil", category: "civil",
  jurisdiction: null, court: null, cnr: null, status: "pending", readinessScore: null,
  nextAction: null, parties: [], facts: [], events: [], tasks: [], notes: [],
  sources: [], documents: [], evidence: [], drafts: [], routes: [],
};

describe("buildCaseJourney", () => {
  it("starts with the court record and ends with the next hearing", () => {
    const j = buildCaseJourney(snap, bundle);
    expect(j.statements.length).toBeGreaterThan(0);
    expect(j.nextHearingDate).toBe("2026-09-10");
    expect(j.statements[j.statements.length - 1].text).toContain("2026-09-10");
  });

  it("detects the evidence-stage run as a procedural pattern", () => {
    const j = buildCaseJourney(snap, bundle);
    const run = j.statements.find((s) => s.text.includes("evidence stage across"));
    expect(run).toBeDefined();
    expect(run!.text).toContain("3 recorded hearings");
  });

  it("bounds a collapsed run to its own first and last hearing dates", () => {
    // Regression: the run is the three Evidence hearings (Feb 14 → Apr 09),
    // NOT the whole history (Jan 10 → May 11) and NOT the following stage.
    const j = buildCaseJourney(snap, bundle);
    const run = j.statements.find((s) => s.text.includes("evidence stage across"));
    expect(run!.text).toContain("2026-02-14 → 2026-04-09");
    expect(run!.text).not.toContain("2026-01-10");
    expect(run!.text).not.toContain("2026-05-11");
  });

  it("mentions the latest order and last hearing", () => {
    const j = buildCaseJourney(snap, bundle);
    const all = j.statements.map((s) => s.text).join(" ");
    expect(all).toContain("Reply within two weeks");
    expect(all).toContain("2026-05-11");
  });

  it("keeps every statement source-backed", () => {
    const j = buildCaseJourney(snap, bundle);
    for (const s of j.statements) {
      expect(s.sources.length).toBeGreaterThan(0);
    }
  });

  it("keeps the underlying hearing table available", () => {
    const j = buildCaseJourney(snap, bundle);
    expect(j.hearings).toHaveLength(5);
  });

  it("handles no snapshot gracefully", () => {
    const j = buildCaseJourney(null, bundle);
    expect(j.statements.length).toBe(1);
    expect(j.nextHearingDate).toBeNull();
  });
});