import { describe, it, expect } from "vitest";
import { analyseCourtOrders } from "@/lib/intelligence/court-orders";
import { detectContradictions } from "@/lib/intelligence/contradictions";
import { detectMissing } from "@/lib/intelligence/missing";
import { buildIssueTree } from "@/lib/workbench/issues";
import { buildFactLedger } from "@/lib/workbench/fact-ledger";
import { buildClaimEvidenceMatrix } from "@/lib/workbench/claim-evidence";
import { buildChronology } from "@/lib/workbench/chronology";
import { buildChangeConditions } from "@/lib/workbench/change-analysis";
import { buildSourceCoverage } from "@/lib/workbench/source-coverage";
import { buildSmartActions } from "@/lib/workbench/actions";
import { buildPreHearingCheck } from "@/lib/workbench/prehearing";
import { buildPostHearingUpdate } from "@/lib/workbench/posthearing";
import { suggestTasks } from "@/lib/intelligence/smart-tasks";
import { buildEntityLedger } from "@/lib/intelligence/entities";
import type { MatterBundle, CaseSnapshotData, OrderText } from "@/lib/intelligence/inputs";

/* A realistic Matter with a stored document, evidence, facts and a cached
 * eCourts snapshot — the same inputs the Workbench pipeline consumes. */

const bundle: MatterBundle = {
  id: "m-1",
  title: "Rental dispute",
  description: null,
  matterType: "civil",
  category: "civil",
  jurisdiction: "Delhi",
  court: "Tis Hazari",
  cnr: "DLND010000012024",
  status: "open",
  readinessScore: null,
  nextAction: null,
  parties: [{ id: "p1", name: "A", role: "petitioner" }, { id: "p2", name: "B", role: "respondent" }],
  facts: [
    { id: "f1", fact: "Tenant paid rent of Rs. 40,000 until March 2025", kind: "statement", source: "user", confidence: null },
    { id: "f2", fact: "Advance of Rs. 2,00,000 was paid", kind: "extracted", source: "document", confidence: null },
  ],
  events: [
    { id: "e1", eventDate: "2025-03-01", title: "Rent last paid", description: null, source: "user" },
  ],
  tasks: [{ id: "t1", title: "File reply", description: null, status: "todo", dueDate: null }],
  notes: [],
  sources: [{ id: "s1", title: "Delhi Rent Act", type: "statute", authority: null, citation: null, url: null, excerpt: null, status: "verified" }],
  documents: [
    { id: "d1", name: "Rental agreement", kind: "court_order", status: "analyzed", summary: "rent payable monthly", extractedText: "The respondent is directed to file reply within two weeks. Deposit Rs. 40,000.", analysis: null },
  ],
  evidence: [{ id: "v1", title: "Bank statement", kind: "bank", status: "available", description: "shows rent transfer of Rs. 40,000", provenance: "bank", suggested: false, documentId: null }],
  drafts: [],
  routes: [],
};

const snapshot: CaseSnapshotData = {
  cnr: "DLND010000012024",
  caseStatus: "pending",
  stage: "Evidence",
  nextHearingDate: "2026-09-01",
  petitioner: "A",
  respondent: "B",
  orderCount: 1,
  history: [{ hearingDate: "2026-08-01", purpose: "Evidence", result: "Part heard", orderSummary: "Reply to be filed within two weeks." }],
  orders: [{ orderDate: "2026-08-01", summary: "Reply to be filed within two weeks.", orderType: "order" }],
  capturedAt: "2026-08-02T00:00:00Z",
  mode: "live",
};

const orderTexts: OrderText[] = [
  { text: "The respondent is directed to file reply within two weeks. Deposit Rs. 40,000.", date: "2026-08-01", origin: "ecourts", label: "eCourts — Order 2026-08-01", recordId: snapshot.cnr },
];

describe("workbench reasoning pipeline (end-to-end)", () => {
  it("runs every stage deterministically on a realistic matter", () => {
    const directions = analyseCourtOrders(orderTexts, bundle.tasks);
    const contradictions = detectContradictions(bundle, snapshot);
    const missing = detectMissing(bundle);
    const tree = buildIssueTree(bundle, { contradictions });
    const ledger = buildFactLedger(bundle, { issues: tree.issues, contradictions });
    const matrix = buildClaimEvidenceMatrix(bundle, { contradictions });
    const chronology = buildChronology(bundle, snapshot);
    const conditions = buildChangeConditions(bundle);
    const coverage = buildSourceCoverage(bundle, snapshot);
    const actions = buildSmartActions({ bundle, directions, missing, contradictions, chronology, issues: tree.issues, upcomingHearing: snapshot.nextHearingDate });
    const preHearing = buildPreHearingCheck({ bundle, directions, contradictions, changes: [], hasSnapshot: true });
    const postHearing = buildPostHearingUpdate({ snapshot, changes: [] });
    const tasks = suggestTasks(directions);
    const entities = buildEntityLedger(bundle, orderTexts, bundle.facts.map((f) => f.fact));

    expect(tree.issues.length).toBeGreaterThan(0);
    expect(ledger.length).toBeGreaterThan(0);
    expect(matrix.length).toBeGreaterThan(0);
    expect(chronology.events.length).toBeGreaterThan(0);
    expect(directions.length).toBeGreaterThan(0);
    expect(tasks.length).toBeGreaterThan(0);
    expect(actions.length).toBeGreaterThan(0);
    expect(coverage.length).toBeGreaterThan(0);
    expect(entities.amounts.length).toBeGreaterThan(0);
    expect(conditions.length).toBeGreaterThan(0);
    expect(preHearing.items.length).toBeGreaterThan(0);
    expect(postHearing.hasChanges).toBe(false);
  });

  it("never emits win/loss or percentage predictions anywhere in the pipeline", () => {
    const directions = analyseCourtOrders(orderTexts, bundle.tasks);
    const contradictions = detectContradictions(bundle, snapshot);
    const tree = buildIssueTree(bundle, { contradictions });
    const ledger = buildFactLedger(bundle, { issues: tree.issues, contradictions });
    const matrix = buildClaimEvidenceMatrix(bundle, { contradictions });
    const chronology = buildChronology(bundle, snapshot);
    const actions = buildSmartActions({ bundle, directions, missing: detectMissing(bundle), contradictions, chronology, issues: tree.issues, upcomingHearing: snapshot.nextHearingDate });
    const tasks = suggestTasks(directions);

    const blob = JSON.stringify({
      directions,
      contradictions,
      tree,
      ledger,
      matrix,
      chronology,
      actions,
      tasks,
    }).toLowerCase();

    expect(blob).not.toContain("%");
    expect(blob).not.toMatch(/chance of (win|losing)/);
    expect(blob).not.toMatch(/your (case|odds) of winning/);
  });
});