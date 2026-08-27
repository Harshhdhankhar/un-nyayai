import { describe, it, expect } from "vitest";
import { askMatter } from "@/lib/workbench/ask";
import type { CaseReasoning } from "@/lib/workbench/types";

function reasoning(over: Partial<CaseReasoning> = {}): CaseReasoning {
  return {
    matterId: "m1",
    generatedAt: new Date().toISOString(),
    usedCachedCase: true,
    caseTheory: [],
    issues: [],
    factLedger: [],
    claimMatrix: [],
    chronology: { findings: [], events: [] },
    counterpositions: [],
    changeConditions: [],
    authorityMatches: [],
    sourceCoverage: [],
    actions: [],
    activity: [],
    snapshot: {
      matterTitle: "Deposit dispute",
      currentStage: "evidence",
      nextHearing: "2026-09-01",
      keyIssues: [],
      keyFacts: [],
      disputedFacts: [],
      importantEvidence: [],
      missingEvidence: ["Bank statement"],
      pendingDirections: ["File reply within two weeks"],
      relevantAuthorities: [],
      nextActions: [],
      risks: [],
      hearingHistory: [
        { date: "2026-01-10", purpose: "adjourned", result: "time sought" },
        { date: "2026-02-10", purpose: "evidence", result: "adjourned" },
        { date: "2026-03-10", purpose: "evidence", result: "adjourned" },
      ],
      generatedAt: new Date().toISOString(),
    },
    preHearing: { items: [], overall: null },
    postHearing: { hasChanges: false, changes: [], proposedEvents: [] },
    smartTasks: [],
    entities: { amounts: [], dates: [], caseNumbers: [], provisions: [], generatedAt: new Date().toISOString() },
    ...over,
  };
}

describe("askMatter delay intent", () => {
  it("routes delay questions to a deterministic hearing-timeline answer", () => {
    const r = askMatter(reasoning(), "why is my case being delayed?");
    expect(r.category).toBe("delay");
    expect(r.answer).toContain("3 hearing(s)");
    expect(r.answer).toContain("adjournment");
    expect(r.answer).toContain("median gap");
    expect(r.sources[0]?.label).toContain("eCourts");
  });

  it("says plainly when there is no hearing history", () => {
    const r = askMatter(reasoning({ snapshot: { ...reasoning().snapshot, hearingHistory: [] } }), "is this delayed?");
    expect(r.category).toBe("delay");
    expect(r.answer).toContain("No court hearing history");
  });
});

describe("askMatter hearing intent", () => {
  it("surfaces next hearing, pending directions and gaps", () => {
    const r = askMatter(reasoning(), "prepare me for the next hearing");
    expect(r.category).toBe("hearing");
    expect(r.answer).toContain("2026-09-01");
    expect(r.answer).toContain("File reply within two weeks");
    expect(r.answer).toContain("Bank statement");
  });
});

describe("askMatter existing intents", () => {
  it("still routes gaps", () => {
    expect(askMatter(reasoning(), "what are the biggest gaps?").category).toBe("gaps");
  });
  it("falls back to unknown", () => {
    const r = askMatter(reasoning(), "tell me a joke");
    expect(r.category).toBe("unknown");
  });
});