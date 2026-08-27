import { describe, it, expect } from "vitest";
import { deriveMatterState } from "@/lib/intelligence/matter-state";
import type { MatterBundle, CaseSnapshotData } from "@/lib/intelligence/inputs";

const NOW = new Date("2026-08-10T00:00:00Z");

function bundle(over: Partial<MatterBundle> = {}): MatterBundle {
  return {
    id: "m1",
    title: "Rent dispute",
    description: null,
    matterType: "civil",
    category: "property",
    jurisdiction: null,
    court: null,
    cnr: null,
    status: "pending",
    readinessScore: null,
    nextAction: null,
    parties: [],
    facts: [],
    events: [],
    tasks: [],
    notes: [],
    sources: [],
    documents: [],
    evidence: [],
    drafts: [],
    routes: [],
    ...over,
  };
}

function snapshot(over: Partial<CaseSnapshotData> = {}): CaseSnapshotData {
  return {
    cnr: "DLND010000012024",
    caseStatus: "pending",
    stage: null,
    nextHearingDate: null,
    petitioner: "A",
    respondent: "B",
    orderCount: 1,
    history: [],
    orders: [],
    capturedAt: "2026-08-01T00:00:00Z",
    mode: "live",
    ...over,
  };
}

describe("deriveMatterState", () => {
  it("reports INTAKE when almost nothing is recorded", () => {
    const s = deriveMatterState(bundle(), null, NOW);
    expect(s.state).toBe("INTAKE");
  });

  it("reports CLOSED for a disposed court record", () => {
    const s = deriveMatterState(bundle(), snapshot({ caseStatus: "disposed" }), NOW);
    expect(s.state).toBe("CLOSED");
  });

  it("reports HEARING_PREPARATION when a hearing is near", () => {
    const s = deriveMatterState(
      bundle(),
      snapshot({ nextHearingDate: "2026-08-20" }),
      NOW
    );
    expect(s.state).toBe("HEARING_PREPARATION");
    expect(s.nextHearingDate).toBe("2026-08-20");
  });

  it("reports PROCEEDING_ACTIVE for a hearing far in the future", () => {
    const s = deriveMatterState(
      bundle(),
      snapshot({ nextHearingDate: "2026-12-01" }),
      NOW
    );
    expect(s.state).toBe("PROCEEDING_ACTIVE");
  });

  it("reports POST_HEARING when the recorded date has passed", () => {
    const s = deriveMatterState(
      bundle(),
      snapshot({ nextHearingDate: "2026-08-01" }),
      NOW
    );
    expect(s.state).toBe("POST_HEARING");
  });

  it("reports AWAITING_COURT_ACTIVITY when pending but no next date", () => {
    const s = deriveMatterState(bundle(), snapshot({ nextHearingDate: null }), NOW);
    expect(s.state).toBe("AWAITING_COURT_ACTIVITY");
  });

  it("reports RESOLUTION_REVIEW when a settlement is present", () => {
    const s = deriveMatterState(
      bundle({ evidence: [{ id: "e1", title: "Settlement offer", kind: "document", status: "available", description: "Offer to settle", provenance: null, suggested: false }] }),
      snapshot(),
      NOW
    );
    expect(s.state).toBe("RESOLUTION_REVIEW");
  });

  it("keeps RESOLUTION_REVIEW out when matter is explicitly closed", () => {
    const s = deriveMatterState(
      bundle({ status: "closed", evidence: [{ id: "e1", title: "Settlement", kind: "document", status: "available", description: "", provenance: null, suggested: false }] }),
      null,
      NOW
    );
    expect(s.state).toBe("CLOSED");
  });

  it("reports INFORMATION_COLLECTION when gaps remain pre-court", () => {
    const s = deriveMatterState(
      bundle({
        facts: [{ id: "f1", fact: "Rent agreement exists", kind: "statement", source: "user", confidence: null }],
        evidence: [{ id: "e1", title: "Agreement", kind: "document", status: "missing", description: null, provenance: null, suggested: false }],
      }),
      null,
      NOW
    );
    expect(s.state).toBe("INFORMATION_COLLECTION");
  });
});