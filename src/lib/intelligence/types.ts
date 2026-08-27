/* =========================================================================
 * Matter Intelligence — shared, client-safe types.
 *
 * This file intentionally imports NOTHING server-only and touches NO database.
 * Every intelligence result flows through these plain, serializable shapes so
 * that server engines and client UI (source drawers, "why this?" panels) share
 * one contract. Nothing here fabricates data — types only describe what a
 * deterministic/source-backed engine produced.
 * ========================================================================= */

/** Where a piece of information came from. Drives claim → source traceability. */
export type SourceKind =
  | "user" // the user stated it
  | "document" // extracted from an uploaded document
  | "ecourts" // the official eCourts record
  | "indian_kanoon" // a retrieved judgment
  | "verified_rule" // a verified statute / limitation rule in our DB
  | "system"; // deterministic computation by NyayAI

/**
 * A reusable, serializable pointer back to the origin of a claim. Rendered by
 * the SourceDrawer so any NyayAI statement can be inspected.
 */
export interface SourceRef {
  kind: SourceKind;
  /** Short human label, e.g. "Rent Agreement.pdf" or "eCourts — Case History". */
  label: string;
  /** The exact field / column the value came from, e.g. "next_hearing_date". */
  field?: string;
  /** A verbatim passage / excerpt from the source, when available. */
  passage?: string;
  /** Page number for documents, when known. */
  page?: number;
  /** Link to the source (Indian Kanoon URL, order URL, …). */
  url?: string;
  /** ISO timestamp the source was retrieved (external providers). */
  retrievedAt?: string;
  /** Opaque id of the backing record (documentId, cnr, tid, factId, …). */
  recordId?: string;
}

/**
 * Confidence / provenance status of a stored or derived fact.
 * Deliberately distinct from the answer-level verification_status enum.
 */
export type ProvenanceStatus =
  | "VERIFIED" // confirmed against an authoritative source
  | "USER_PROVIDED" // the user asserted it
  | "EXTRACTED" // pulled from a document by extraction
  | "INTERPRETATION" // NyayAI's reading, not a raw fact
  | "NEEDS_VERIFICATION"; // present but unconfirmed / conflicting

/** A traceable statement: text + how confident we are + where it came from. */
export interface Claim {
  id: string;
  text: string;
  status: ProvenanceStatus;
  sources: SourceRef[];
}

/* ------------------------------ knowledge graph ------------------------- */

export type GraphNodeType =
  | "matter"
  | "fact"
  | "party"
  | "document"
  | "evidence"
  | "event"
  | "hearing"
  | "order"
  | "direction"
  | "issue"
  | "section"
  | "judgment"
  | "research"
  | "task"
  | "deadline"
  | "step";

export type GraphEdgeType =
  | "MENTIONS"
  | "SOURCED_FROM"
  | "RELATES_TO"
  | "CREATES"
  | "REQUIRES"
  | "SUPPORTS"
  | "ABOUT"
  | "SCHEDULES"
  | "CONFLICTS_WITH";

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  status?: ProvenanceStatus;
  sources: SourceRef[];
  /** Free-form extras (dates, amounts) — never used for scoring, display only. */
  meta?: Record<string, string | number | boolean | null>;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  type: GraphEdgeType;
  /** Why this edge exists, in plain language. */
  reason: string;
  sources: SourceRef[];
}

export interface MatterGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/* ------------------------------ contradictions -------------------------- */

export type ContradictionKind =
  | "amount"
  | "date"
  | "name"
  | "case_number"
  | "event";

export interface ContradictionValue {
  value: string;
  source: SourceRef;
}

export interface Contradiction {
  id: string;
  kind: ContradictionKind;
  /** What the two records disagree about, e.g. "Security deposit amount". */
  label: string;
  values: ContradictionValue[];
  /** Never asserts which side is correct. */
  note: string;
}

/* -------------------------------- missing ------------------------------- */

export interface MissingItem {
  id: string;
  title: string;
  /** Why it matters for THIS matter — never "it is mandatory" unless verified. */
  why: string;
  sources: SourceRef[];
}

/* ----------------------------- court orders ----------------------------- */

export interface CourtDirection {
  id: string;
  /** The directive as read from the order, e.g. "File reply within two weeks". */
  text: string;
  /** Who it appears to be addressed to, if detectable. Empty when unclear. */
  addressee: string;
  /** Optional derived deadline — always carries a verification status. */
  deadline?: {
    dueDate: string | null;
    basis: string;
    status: ProvenanceStatus;
  };
  source: SourceRef;
  /** Compliance, derived from whether a matching task/event is complete. */
  compliance: "pending" | "possibly_done" | "unknown";
}

/* --------------------------- change intelligence ------------------------ */

export type ChangeKind =
  | "new_order"
  | "next_hearing_changed"
  | "stage_changed"
  | "status_changed"
  | "new_listing"
  | "party_updated";

export interface SnapshotChange {
  kind: ChangeKind;
  label: string;
  before: string | null;
  after: string | null;
  source: SourceRef;
}

/* ----------------------------- readiness -------------------------------- */

export type ReadinessDimensionKey =
  | "factCompleteness"
  | "evidenceCoverage"
  | "documentCoverage"
  | "timelineCompleteness"
  | "sourceVerification"
  | "courtDirectionCompliance"
  | "researchCoverage";

export interface ReadinessDimension {
  key: ReadinessDimensionKey;
  label: string;
  /** 0..100 for this dimension, or null when there is nothing to measure. */
  score: number | null;
  status: "strong" | "partial" | "thin" | "unknown";
  /** Bullet explanations of what is complete. */
  complete: string[];
  /** Bullet explanations of what is missing. */
  missing: string[];
}

export interface ReadinessExplanation {
  overall: number;
  dimensions: ReadinessDimension[];
}

/* -------------------------------- delay --------------------------------- */

export interface DelayPatternBucket {
  reason: string;
  count: number;
  /** Factual, source-linked description. Never accuses anyone. */
  statement: string;
  hearingDates: string[];
}

export interface DelayPatternMap {
  totalHearings: number;
  postponed: number;
  substantive: number;
  averageGapDays: number | null;
  longestGapDays: number | null;
  buckets: DelayPatternBucket[];
  /** Overall factual summary, e.g. "Records show 6 adjournments…". */
  summary: string;
  source: SourceRef;
}

export interface CostOfDelayInput {
  dailyIncomeLost?: number;
  travelCostPerAppearance?: number;
  otherCostPerAppearance?: number;
  currency?: string;
}

export interface CostOfDelay {
  appearances: number;
  estimatedWorkingDaysAffected: number;
  estimatedLostIncome: number;
  estimatedTravel: number;
  estimatedOther: number;
  total: number;
  currency: string;
  /** Always shown to the user. */
  disclaimer: string;
}

/* --------------------------- intelligence summary ----------------------- */

export type IntelligenceSectionKey =
  | "changed"
  | "attention"
  | "missing"
  | "conflict"
  | "court"
  | "research"
  | "prepare";

export interface IntelligenceItem {
  id: string;
  title: string;
  detail?: string;
  /** Plain-language "why this?" reasoning shown behind a disclosure. */
  why?: string;
  sources: SourceRef[];
  /** Optional in-app link the UI can render as an action. */
  href?: string;
  status?: ProvenanceStatus;
}

export interface IntelligenceSection {
  key: IntelligenceSectionKey;
  title: string;
  items: IntelligenceItem[];
}

export interface MatterIntelligence {
  matterId: string;
  generatedAt: string;
  /** One-line current position, always source-backed or explicitly UNKNOWN. */
  currentPosition: string;
  nextAction: IntelligenceItem | null;
  /** Only sections with meaningful content are included. */
  sections: IntelligenceSection[];
  /** True when eCourts data is from a cached snapshot rather than live. */
  usedCachedCase: boolean;
}

/* ------------------------------- research ------------------------------- */

export interface ResearchIntent {
  topic: string;
  jurisdiction: string;
  court: string;
  fromDate: string | null;
  toDate: string | null;
  legalConcepts: string[];
  searchPhrases: string[];
  provisions: string[];
  /** The human-readable rendering shown as "YOUR QUERY". */
  humanQuery: string;
  /** The actual query string sent to Indian Kanoon. */
  compiledQuery: string;
}

export interface AuthorityRelevanceSignal {
  label: string;
  detail: string;
  /** 0..1 contribution — transparent, never called "legal strength". */
  weight: number;
}

export interface AuthorityRelevance {
  tid: number;
  title: string;
  court: string;
  date: string;
  url: string;
  /** 0..100 transparent relevance, NOT a prediction of winning. */
  relevance: number;
  signals: AuthorityRelevanceSignal[];
}

/* ---------------------------- opposition / brief ------------------------ */

export interface OppositionPoint {
  position: string;
  counterpoint: string;
  needsClarification: string;
  sources: SourceRef[];
}

export interface OppositionView {
  points: OppositionPoint[];
  note: string;
}

export interface ArgumentBrief {
  proposition: string;
  supportingEvidence: Claim[];
  supportiveAuthorities: AuthorityRelevance[];
  adverseMaterial: Claim[];
  missingSupport: string[];
  sources: SourceRef[];
}

export interface HearingBriefSection {
  title: string;
  items: IntelligenceItem[];
}

export interface HearingBrief {
  matterId: string;
  currentPosition: string;
  sections: HearingBriefSection[];
  usedCachedCase: boolean;
}

export interface ClientUpdate {
  whatHappened: string;
  whatChanged: string[];
  nextDate: string | null;
  whatIsNeeded: string[];
  /** Copy/exportable plain-text version. */
  plainText: string;
  sources: SourceRef[];
}

/* ------------------------------- commands ------------------------------- */

export type MatterCommandKind =
  | "explain_changed"
  | "prepare_hearing"
  | "find_judgments"
  | "missing_evidence"
  | "check_contradictions"
  | "analyse_delay"
  | "explain_order"
  | "compare_settlement"
  | "client_update"
  | "unknown";

export interface CommandRoute {
  kind: MatterCommandKind;
  reason: string;
  /** Any free-text argument (a proposition, a search topic). */
  argument?: string;
}
