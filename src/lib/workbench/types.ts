/* =========================================================================
 * Legal Workbench — shared, client-safe types.
 *
 * The Workbench turns a complicated Matter into a structured legal case map
 * (issues → claims → facts → evidence → authority → counterpoint → gap). This
 * file intentionally imports NOTHING server-only and touches NO database, so
 * the shapes are serializable end-to-end (server assembler → API → client UI).
 *
 * Everything is source-backed and explainable: every node carries SourceRef[]
 * provenance and an explicit UncertaintyStatus. Nothing here implies a legal
 * outcome — the statuses describe information coverage, not winning.
 * ========================================================================= */

import type {
  Claim,
  SourceKind,
  SourceRef,
} from "@/lib/intelligence/types";
import type { SmartTask } from "@/lib/intelligence/smart-tasks";
import type { EntityLedger } from "@/lib/intelligence/entities";

export type {
  Claim,
  SourceKind,
  SourceRef,
};

/**
 * Extended uncertainty vocabulary (Section 20). Deliberately broader than the
 * base ProvenanceStatus so the UI can distinguish "document supported" from
 * "court record", and can name "conflicting" / "missing" / "unknown" states.
 * None of these is a prediction of legal success.
 */
export type UncertaintyStatus =
  | "VERIFIED" // confirmed against an authoritative source
  | "DOCUMENT_SUPPORTED" // grounded in an uploaded document's text
  | "COURT_RECORD" // taken from the official eCourts record
  | "USER_PROVIDED" // the user asserted it
  | "INTERPRETATION" // NyayAI's reading, not a raw fact
  | "CONFLICTING" // two records disagree (never adjudicated here)
  | "MISSING" // an important item that is absent
  | "UNKNOWN"; // present but cannot be assessed from stored data

/* ------------------------------ case theory ----------------------------- */

/** A single node in the Case Theory Map. Always links back to its source. */
export interface TheoryNode {
  id: string;
  /** LEGAL_ISSUE | CLAIM | FACT | EVIDENCE | AUTHORITY | COUNTERPOINT | GAP */
  kind: TheoryNodeKind;
  label: string;
  /** Coverage/uncertainty for this node. */
  status: UncertaintyStatus;
  sources: SourceRef[];
  /** Free-form extras (dates, amounts) — display only, never scored. */
  meta?: Record<string, string | number | boolean | null>;
  /** Child nodes (claim's supporting facts, a fact's evidence, …). */
  children?: TheoryNode[];
}

export type TheoryNodeKind =
  | "LEGAL_ISSUE"
  | "CLAIM"
  | "FACT"
  | "EVIDENCE"
  | "AUTHORITY"
  | "COUNTERPOINT"
  | "GAP";

/* ------------------------------ issue tree ------------------------------ */

/** Coverage of an issue — describes information coverage, NOT legal merit. */
export type IssueCoverageStatus =
  | "SUPPORTED"
  | "PARTIALLY_SUPPORTED"
  | "DISPUTED"
  | "MISSING_INFORMATION"
  | "NEEDS_RESEARCH";

export interface Issue {
  id: string;
  /** "legal" or "factual" — an issue may be either. */
  type: "legal" | "factual";
  title: string;
  /** Plain-language phrasing as a question, e.g. "Was a deposit paid?". */
  question: string;
  coverage: IssueCoverageStatus;
  /** Facts that bear on this issue. */
  factIds: string[];
  /** Evidence item ids that bear on this issue. */
  evidenceIds: string[];
  /** Linked authority (matter source) ids. */
  authorityIds: string[];
  /** Open question / gap tied to this issue. */
  gap?: string;
  sources: SourceRef[];
}

export interface IssueTree {
  issues: Issue[];
}

/* ------------------------------- fact ledger ---------------------------- */

/** Coverage markers available to a ledger row. */
export type LedgerStatus = UncertaintyStatus;

export interface FactLedgerEntry {
  id: string;
  statement: string;
  /** Normalized value when the fact carries one (an amount/date). */
  value?: string;
  /** ISO date when the fact is dated. */
  date?: string;
  sources: SourceRef[];
  status: LedgerStatus;
  /** Issue ids this fact relates to. */
  relatedIssueIds: string[];
  /** Sources that state a different value for the same fact, if any. */
  conflictingSources: SourceRef[];
}

/* --------------------------- claim–evidence matrix ---------------------- */

/** Source coverage of a claim — explicitly NOT "legally sufficient". */
export type SourceCoverageTier = "strong" | "moderate" | "limited";

export interface ClaimEvidenceRow {
  id: string;
  claim: string;
  supporting: Claim[];
  contradicting: Claim[];
  /** What is still missing to fully support the claim. */
  missing: string[];
  coverage: SourceCoverageTier;
  /** Plain explanation of why this tier was assigned. */
  coverageReason: string;
}

/* -------------------------------- chronology ---------------------------- */

export type ChronologyEventStatus =
  | "VERIFIED"
  | "DOCUMENT_SUPPORTED"
  | "COURT_RECORD"
  | "USER_PROVIDED"
  | "CONFLICTING"
  | "MISSING";

export interface ChronologyEvent {
  id: string;
  /** ISO date when known. */
  date: string | null;
  label: string;
  source: SourceRef;
  status: ChronologyEventStatus;
}

export interface ChronologyFinding {
  kind: "missing_date" | "date_conflict" | "impossible_ordering" | "large_gap";
  title: string;
  detail: string;
  sources: SourceRef[];
}

export interface Chronology {
  events: ChronologyEvent[];
  findings: ChronologyFinding[];
}

/* ------------------------------ counterposition ------------------------- */

export interface Counterposition {
  id: string;
  /** YOUR POSITION. */
  position: string;
  /** POSSIBLE COUNTERPOSITION (only from Matter material / verified research). */
  counterposition: string;
  /** SOURCE for the counterposition. */
  source: SourceRef | null;
  /** YOUR AVAILABLE RESPONSE MATERIAL. */
  responseMaterial: string;
  /** UNRESOLVED QUESTION. */
  unresolvedQuestion: string;
}

/* --------------------------- what would change -------------------------- */

export interface ChangeCondition {
  id: string;
  /** The current conclusion that could change. */
  conclusion: string;
  /** Plain-language conditions that would alter the conclusion. */
  conditions: string[];
  /** Why we are flagging this (anti-overconfidence). */
  basis: string;
}

/* --------------------------- issue → authority ------------------------- */

export interface AuthorityMatch {
  id: string;
  issueId: string;
  issueTitle: string;
  authorityId: string;
  title: string;
  /** Why this authority is relevant to the issue. */
  whyRelevant: string;
  /** Relevant passage, when stored. */
  passage?: string;
  court?: string;
  date?: string;
  citation?: string;
  source: SourceRef;
  /** Whether binding precedent is actually inferable (hierarchy + jurisdiction). */
  precedentInference: boolean;
}

/* ------------------------------- source coverage ------------------------ */

export interface SourceCoverageBucket {
  kind: SourceKind | "document";
  label: string;
  count: number;
}

export interface SourceCoverageCategory {
  category: string;
  buckets: SourceCoverageBucket[];
}

/* --------------------------------- actions ------------------------------ */

export interface SmartAction {
  id: string;
  title: string;
  /** WHY THIS ACTION APPEARS — always explained. */
  why: string;
  type:
    | "reply"
    | "evidence"
    | "hearing"
    | "settlement"
    | "delay"
    | "research"
    | "verify"
    | "task"
    | "post_hearing"
    | "other";
  href?: string;
  sources: SourceRef[];
}

/* ------------------------------ activity feed --------------------------- */

export interface ActivityItem {
  id: string;
  kind:
    | "order"
    | "conflict"
    | "research"
    | "direction"
    | "evidence"
    | "hearing"
    | "missing"
    | "action";
  title: string;
  detail?: string;
  sources: SourceRef[];
}

/* ------------------------------ pre-hearing check ----------------------- */

export type CheckStatus = "READY" | "NEEDS_ATTENTION" | "MISSING";

export interface PreHearingItem {
  id: string;
  check: string;
  status: CheckStatus;
  detail: string;
  sources: SourceRef[];
}

export interface PreHearingCheck {
  items: PreHearingItem[];
  /** Status when a next hearing exists; null otherwise. */
  overall: CheckStatus | null;
}

/* ------------------------------- matter snapshot ------------------------ */

export interface SnapshotField {
  label: string;
  value: string;
  sources: SourceRef[];
}

export interface MatterSnapshot {
  matterTitle: string;
  currentStage: string | null;
  nextHearing: string | null;
  keyIssues: string[];
  keyFacts: SnapshotField[];
  disputedFacts: SnapshotField[];
  importantEvidence: string[];
  missingEvidence: string[];
  pendingDirections: string[];
  relevantAuthorities: string[];
  nextActions: string[];
  risks: string[];
  /** Compact raw hearing history (from the cached court record) for delay analysis. */
  hearingHistory: Array<{ date: string; purpose: string; result: string }>;
  generatedAt: string;
}

/* ------------------------------ post-hearing ---------------------------- */

export interface PostHearingChange {
  id: string;
  kind:
    | "new_hearing"
    | "new_order"
    | "next_date_changed"
    | "new_direction"
    | "stage_changed"
    | "status_changed"
    | "party_updated";
  label: string;
  before: string | null;
  after: string | null;
  source: SourceRef;
  /** Whether this is derived/uncertain and should be reviewed before applying. */
  reviewRequired: boolean;
}

export interface PostHearingUpdate {
  hasChanges: boolean;
  changes: PostHearingChange[];
  /** What to record when the user confirms. */
  proposedEvents: Array<{ eventDate?: string; title: string; description?: string; source: "ecourts" }>;
}

/* ------------------------------ ask the matter -------------------------- */

export interface AskResult {
  question: string;
  answer: string;
  /** A short machine label for the answer category. */
  category:
    | "gaps"
    | "changed"
    | "single_source"
    | "contradictions"
    | "evidence"
    | "authorities"
    | "directions"
    | "chronology"
    | "delay"
    | "hearing"
    | "unknown";
  sources: SourceRef[];
}

/* ------------------------------- cross-exam ----------------------------- */

export interface CrossExamMatch {
  documentName: string;
  documentId: string;
  page: number | null;
  passage: string;
}

export interface CrossExamResult {
  question: string;
  answer: string;
  matches: CrossExamMatch[];
  conflicts: CrossExamMatch[];
  /** Only true when the question is document-dependent. */
  answeredFromDocuments: boolean;
}

/* -------------------------------- search -------------------------------- */

export interface SearchGroup {
  group: "FACTS" | "DOCUMENTS" | "COURT_RECORD" | "RESEARCH" | "TIMELINE" | "EVIDENCE" | "DRAFTS" | "NOTES";
  items: Array<{ id: string; title: string; detail?: string; href?: string; page?: number | null }>;
}

export interface MatterSearchResult {
  query: string;
  groups: SearchGroup[];
  total: number;
}

/* ------------------------------ the workbench --------------------------- */

/**
 * The full, assembled Case Reasoning payload served to the Workbench UI.
 * One deterministic pass over a loaded Matter bundle + cached case snapshot.
 */
export interface CaseReasoning {
  matterId: string;
  generatedAt: string;
  usedCachedCase: boolean;
  caseTheory: TheoryNode[];
  issues: Issue[];
  factLedger: FactLedgerEntry[];
  claimMatrix: ClaimEvidenceRow[];
  chronology: Chronology;
  counterpositions: Counterposition[];
  changeConditions: ChangeCondition[];
  authorityMatches: AuthorityMatch[];
  sourceCoverage: SourceCoverageCategory[];
  actions: SmartAction[];
  activity: ActivityItem[];
  snapshot: MatterSnapshot;
  preHearing: PreHearingCheck;
  postHearing: PostHearingUpdate;
  smartTasks: SmartTask[];
  entities: EntityLedger;
}
