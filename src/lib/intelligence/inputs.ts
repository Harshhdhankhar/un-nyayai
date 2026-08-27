/* =========================================================================
 * Intelligence inputs — the structural shape the analyzers consume.
 *
 * The engine performs ONE database read (getMatter) and passes the already
 * loaded bundle to the pure analyzers below. Defining a loose structural type
 * here (rather than importing the server-only Drizzle return type) keeps every
 * analyzer free of `server-only`, DB and network imports — so they are pure,
 * deterministic and unit-testable. The real getMatter() result is structurally
 * compatible with MatterBundle.
 * ========================================================================= */

export interface FactRow {
  id: string;
  fact: string;
  kind: string; // statement | extracted | missing
  source: string; // user | document | ecourts | ai
  confidence: string | null;
}

export interface PartyRow {
  id: string;
  name: string;
  role: string;
}

export interface EventRow {
  id: string;
  eventDate: string | null;
  title: string;
  description: string | null;
  source: string; // user | document | ecourts | ai
}

export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: string; // todo | in_progress | done
  dueDate: string | null;
}

export interface NoteRow {
  id: string;
  body: string;
}

export interface SourceRow {
  id: string;
  title: string;
  type: string;
  authority: string | null;
  citation: string | null;
  url: string | null;
  excerpt: string | null;
  status: string; // verified | interpretation | needs_verification
}

export interface DocumentRow {
  id: string;
  name: string;
  kind: string;
  status: string;
  summary: string | null;
  extractedText: string | null;
  analysis: unknown;
}

export interface EvidenceRow {
  id: string;
  title: string;
  kind: string;
  status: string; // available | missing | needs_verification
  description: string | null;
  provenance: string | null;
  suggested: boolean;
  documentId?: string | null;
}

export interface DraftRow {
  id: string;
  title: string;
  kind: string;
  status: string;
}

export interface RouteInstanceRow {
  id: string;
  routeId: string;
  status: string;
  currentStepOrder: number;
}

export interface MatterBundle {
  id: string;
  title: string;
  description: string | null;
  matterType: string;
  category: string;
  jurisdiction: string | null;
  court: string | null;
  cnr: string | null;
  status: string;
  readinessScore: number | null;
  nextAction: string | null;
  parties: PartyRow[];
  facts: FactRow[];
  events: EventRow[];
  tasks: TaskRow[];
  notes: NoteRow[];
  sources: SourceRow[];
  documents: DocumentRow[];
  evidence: EvidenceRow[];
  drafts: DraftRow[];
  routes: RouteInstanceRow[];
}

/** A single order/direction-bearing text, assembled by the engine from
 * uploaded court-order documents and cached eCourts orders/history. */
export interface OrderText {
  text: string;
  /** ISO date of the order when known. */
  date: string | null;
  /** "document" | "ecourts" — drives which SourceRef the analyzer builds. */
  origin: "document" | "ecourts";
  /** Human label, e.g. "Court Order.pdf" or "eCourts — Order 12 Mar 2024". */
  label: string;
  /** Backing record id (documentId / cnr). */
  recordId?: string;
}

/** Case snapshot shape used by change intelligence — mirrors the cached
 * eCourts record without importing the provider's server-only types. */
export interface CaseSnapshotData {
  cnr: string;
  caseStatus: string | null;
  stage: string | null;
  nextHearingDate: string | null;
  petitioner: string | null;
  respondent: string | null;
  orderCount: number | null;
  history: Array<{ hearingDate: string; purpose?: string | null; result?: string | null; orderSummary?: string | null }>;
  orders: Array<{ orderDate: string; summary: string; orderType?: string | null }>;
  /** ISO timestamp this snapshot was captured. */
  capturedAt: string;
  mode: "live" | "demo";
}
