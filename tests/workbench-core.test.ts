import { describe, it, expect } from "vitest";
import { buildChronology } from "@/lib/workbench/chronology";
import { buildFactLedger } from "@/lib/workbench/fact-ledger";
import { buildClaimEvidenceMatrix } from "@/lib/workbench/claim-evidence";
import { buildChangeConditions } from "@/lib/workbench/change-analysis";
import { buildSmartActions } from "@/lib/workbench/actions";
import { buildSourceCoverage } from "@/lib/workbench/source-coverage";
import { buildPostHearingUpdate } from "@/lib/workbench/posthearing";
import { buildPreHearingCheck } from "@/lib/workbench/prehearing";
import { buildIssueTree } from "@/lib/workbench/issues";
import { buildActivityFeed } from "@/lib/workbench/activity";
import type { MatterBundle, CaseSnapshotData } from "@/lib/intelligence/inputs";
import type { Contradiction } from "@/lib/intelligence/types";
import type { CourtDirection } from "@/lib/intelligence/types";
import type { SnapshotChange } from "@/lib/intelligence/types";
import type { Chronology, Issue } from "@/lib/workbench/types";

function bundle(overrides: Partial<MatterBundle> = {}): MatterBundle {
  return {
    id: "m-1",
    title: "Rental dispute",
    description: null,
    matterType: "civil",
    category: "civil",
    jurisdiction: null,
    court: null,
    cnr: null,
    status: "open",
    readinessScore: null,
    nextAction: null,
    parties: [],
    facts: [
      { id: "f1", fact: "Tenant paid rent of Rs. 40,000 until March 2025", kind: "statement", source: "user", confidence: null },
      { id: "f2", fact: "Advance of Rs. 2,00,000 was paid", kind: "extracted", source: "document", confidence: null },
    ],
    events: [
      { id: "e1", eventDate: "2025-03-01", title: "Rent last paid", description: null, source: "user" },
      { id: "e2", eventDate: null, title: "Notice served", description: null, source: "user" },
    ],
    tasks: [],
    notes: [],
    sources: [],
    documents: [
      { id: "d1", name: "Rental agreement", kind: "agreement", status: "analyzed", summary: "rent payable monthly", extractedText: "Rent payable monthly, advance of Rs. 2,00,000 paid on 01 June 2024.", analysis: null },
    ],
    evidence: [
      { id: "v1", title: "Bank statement", kind: "bank", status: "available", description: "shows rent transfer of Rs. 40,000", provenance: "bank", suggested: false, documentId: null },
    ],
    drafts: [],
    orders: [],
    history: [],
    ...overrides,
  } as MatterBundle;
}

describe("buildChronology", () => {
  it("builds events from matter timeline and facts", () => {
    const c = buildChronology(bundle(), null);
    expect(c.events.length).toBeGreaterThanOrEqual(3);
  });

  it("flags events without a recorded date", () => {
    const c = buildChronology(bundle(), null);
    expect(c.findings.some((f) => f.kind === "missing_date")).toBe(true);
  });

  it("does not fabricate an ordering beyond recorded sources", () => {
    const c = buildChronology(bundle(), null);
    const withDates = c.events.filter((e) => e.date);
    for (let i = 1; i < withDates.length; i++) {
      expect(withDates[i - 1].date! <= withDates[i].date!).toBe(true);
    }
  });

  it("adds court-record hearings from the snapshot", () => {
    const snap = {
      cnr: "DLND010000012024",
      caseStatus: "pending",
      stage: null,
      nextHearingDate: null,
      petitioner: "A",
      respondent: "B",
      orderCount: 1,
      history: [{ hearingDate: "2026-01-10", purpose: "Arguments", result: "Part heard", orderSummary: null }],
      orders: [{ orderDate: "2026-01-10", summary: "Listed for arguments", orderType: "order" }],
      capturedAt: "2026-08-01T00:00:00Z",
      mode: "live",
    } as CaseSnapshotData;
    const c = buildChronology(bundle(), snap);
    const court = c.events.filter((e) => e.status === "COURT_RECORD");
    expect(court.length).toBeGreaterThanOrEqual(2);
  });
});

describe("buildFactLedger", () => {
  it("derives a value and date from fact text", () => {
    const ledger = buildFactLedger(bundle());
    const f1 = ledger.find((l) => l.id === "f1");
    expect(f1?.value).toBeTruthy();
  });

  it("labels extracted facts as document-supported", () => {
    const ledger = buildFactLedger(bundle());
    const f2 = ledger.find((l) => l.id === "f2");
    expect(f2?.status).toBe("DOCUMENT_SUPPORTED");
  });

  it("marks a fact conflicting when contradictions share salient values", () => {
    const contradiction: Contradiction = {
      id: "c1",
      kind: "amount",
      label: "Rent amount disputed",
      note: "Two sources record different figures.",
      values: [
        { value: "Rs. 40,000", source: { kind: "user", label: "Tenant" } },
        { value: "Rs. 60,000", source: { kind: "user", label: "Landlord" } },
      ],
    };
    const ledger = buildFactLedger(bundle(), { contradictions: [contradiction] });
    expect(ledger.some((l) => l.status === "CONFLICTING")).toBe(true);
  });
});

describe("buildClaimEvidenceMatrix", () => {
  it("ties supporting documents to corroborated claims with strong coverage", () => {
    const rows = buildClaimEvidenceMatrix(bundle());
    const row = rows.find((r) => r.claim.includes("40,000"));
    expect(row).toBeTruthy();
    expect(row!.coverage).toBe("strong");
    expect(row!.supporting.length).toBeGreaterThan(0);
  });

  it("never uses 'legally sufficient' language", () => {
    const rows = buildClaimEvidenceMatrix(bundle());
    for (const row of rows) {
      expect(row.coverageReason.toLowerCase()).not.toContain("legally sufficient");
    }
  });
});

describe("buildChangeConditions", () => {
  it("names amount-specific conditions for amount-bearing facts", () => {
    const conditions = buildChangeConditions(bundle());
    const row = conditions.find((c) => c.conclusion.includes("40,000"));
    expect(row?.conditions.some((x) => x.includes("amount"))).toBe(true);
  });

  it("skips missing facts", () => {
    const b = bundle();
    b.facts = [{ id: "f9", fact: "missing evidence", kind: "missing", source: "user", confidence: null }];
    const conditions = buildChangeConditions(b);
    expect(conditions.length).toBe(0);
  });
});

describe("buildSmartActions", () => {
  const chrono: Chronology = { events: [], findings: [] };
  const issues: Issue[] = [];

  it("suggests a reply action for a pending court direction", () => {
    const direction: CourtDirection = {
      id: "dir-1",
      text: "File reply within two weeks",
      addressee: "Respondent",
      source: { kind: "ecourts", label: "Order dated 01 July 2026", field: "orders", recordId: "cnr-1", retrievedAt: "2026-07-01" },
      compliance: "pending",
    };
    const actions = buildSmartActions({ bundle: bundle(), directions: [direction], missing: [], contradictions: [], chronology: chrono, issues, upcomingHearing: null });
    expect(actions.some((a) => a.type === "reply")).toBe(true);
    expect(actions[0].why).toContain("direction");
  });

  it("suggests research when an issue needs research", () => {
    const issueIssues: Issue[] = [{ id: "i1", type: "legal", title: "x", question: "q", coverage: "NEEDS_RESEARCH", factIds: [], evidenceIds: [], authorityIds: [], sources: [] }];
    const actions = buildSmartActions({ bundle: bundle(), directions: [], missing: [], contradictions: [], chronology: chrono, issues: issueIssues, upcomingHearing: null });
    expect(actions.some((a) => a.type === "research")).toBe(true);
  });

  it("suggests a hearing brief when there is an upcoming hearing", () => {
    const actions = buildSmartActions({ bundle: bundle(), directions: [], missing: [], contradictions: [], chronology: chrono, issues, upcomingHearing: "2026-09-01" });
    expect(actions.some((a) => a.type === "hearing")).toBe(true);
  });

  it("suggests resolving detected contradictions", () => {
    const contradiction: Contradiction = {
      id: "c1",
      kind: "amount",
      label: "Rent disputed",
      note: "Two sources record different figures.",
      values: [
        { value: "Rs. 40,000", source: { kind: "user", label: "Tenant" } },
        { value: "Rs. 60,000", source: { kind: "user", label: "Landlord" } },
      ],
    };
    const actions = buildSmartActions({ bundle: bundle(), directions: [], missing: [], contradictions: [contradiction], chronology: chrono, issues, upcomingHearing: null });
    expect(actions.some((a) => a.type === "verify")).toBe(true);
  });
});

describe("buildSourceCoverage", () => {
  it("reports source counts as numbers, never percentages", () => {
    const categories = buildSourceCoverage(bundle(), null);
    for (const c of categories) {
      for (const b of c.buckets) {
        expect(typeof b.count).toBe("number");
      }
      expect(JSON.stringify(c).includes("%")).toBe(false);
    }
  });

  it("includes a case-record bucket when a snapshot is present", () => {
    const snap = {
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
    } as CaseSnapshotData;
    const categories = buildSourceCoverage(bundle(), snap);
    const caseInfo = categories.find((c) => c.category === "Case information");
    expect(caseInfo).toBeTruthy();
  });
});

describe("buildPostHearingUpdate", () => {
  const snap = {
    cnr: "DLND010000012024",
    caseStatus: "pending",
    stage: null,
    nextHearingDate: null,
    petitioner: "A",
    respondent: "B",
    orderCount: 0,
    history: [],
    orders: [],
    capturedAt: "2026-08-01T00:00:00Z",
    mode: "live",
  } as CaseSnapshotData;
  const src = { kind: "ecourts" as const, label: "eCourts — Case record", recordId: "cnr-1" };

  it("returns no changes when the diff is empty", () => {
    const u = buildPostHearingUpdate({ snapshot: snap, changes: [] });
    expect(u.hasChanges).toBe(false);
    expect(u.changes).toHaveLength(0);
  });

  it("marks a new order as review-required and proposes an event", () => {
    const change: SnapshotChange = { kind: "new_order", label: "New order", before: null, after: "Order passed", source: src };
    const u = buildPostHearingUpdate({ snapshot: snap, changes: [change] });
    expect(u.hasChanges).toBe(true);
    expect(u.changes[0].reviewRequired).toBe(true);
    expect(u.proposedEvents.some((e) => e.title.includes("New order"))).toBe(true);
  });

  it("does not mark a stage change as review-required", () => {
    const change: SnapshotChange = { kind: "stage_changed", label: "Stage", before: "Pleading", after: "Evidence", source: src };
    const u = buildPostHearingUpdate({ snapshot: snap, changes: [change] });
    expect(u.changes[0].reviewRequired).toBe(false);
  });
});

describe("buildPreHearingCheck", () => {
  it("reports overall as worst-item status, not a score", () => {
    const check = buildPreHearingCheck({ bundle: bundle(), directions: [], contradictions: [], changes: [], hasSnapshot: false });
    expect(["READY", "NEEDS_ATTENTION", "MISSING"]).toContain(check.overall);
    expect(check.items.some((i) => i.status === "MISSING")).toBe(true);
  });

  it("flags pending directions as needs-attention", () => {
    const direction: CourtDirection = {
      id: "dir-1",
      text: "File reply",
      addressee: "",
      source: { kind: "ecourts", label: "Order", field: "orders", recordId: "cnr-1", retrievedAt: "2026-07-01" },
      compliance: "pending",
    };
    const check = buildPreHearingCheck({ bundle: bundle(), directions: [direction], contradictions: [], changes: [], hasSnapshot: true });
    const item = check.items.find((i) => i.check === "Court directions addressed");
    expect(item?.status).toBe("NEEDS_ATTENTION");
  });

  it("is READY for a fully prepared matter", () => {
    const b = bundle();
    const check = buildPreHearingCheck({ bundle: b, directions: [], contradictions: [], changes: [], hasSnapshot: true });
    const item = check.items.find((i) => i.check === "Latest court order reviewed");
    expect(item?.status).toBe("READY");
  });
});

describe("buildIssueTree", () => {
  it("clusters facts into issues and never claims legal merit", () => {
    const tree = buildIssueTree(bundle());
    expect(tree.issues.length).toBeGreaterThan(0);
    for (const issue of tree.issues) {
      expect(["SUPPORTED", "PARTIALLY_SUPPORTED", "DISPUTED", "MISSING_INFORMATION", "NEEDS_RESEARCH"]).toContain(issue.coverage);
    }
  });

  it("detects a covered factual issue", () => {
    const tree = buildIssueTree(bundle());
    const issue = tree.issues.find((i) => i.title.includes("40,000"));
    expect(issue).toBeTruthy();
    expect(issue!.coverage).toBe("SUPPORTED");
  });
});

describe("buildActivityFeed", () => {
  const chrono: Chronology = { events: [], findings: [] };

  it("surfaces a new-order change as an order item", () => {
    const change: SnapshotChange = { kind: "new_order", label: "New order", before: null, after: "Order", source: { kind: "ecourts", label: "eCourts", recordId: "cnr-1" } };
    const items = buildActivityFeed({ changes: [change], directions: [], missing: [], contradictions: [], chronology: chrono, authorityCount: 0, evidenceSupportCount: 0 });
    expect(items.some((i) => i.kind === "order" && i.title.includes("New court order"))).toBe(true);
  });

  it("produces no items when there is nothing to report", () => {
    const items = buildActivityFeed({ changes: [], directions: [], missing: [], contradictions: [], chronology: chrono, authorityCount: 0, evidenceSupportCount: 0 });
    expect(items.length).toBe(0);
  });
});