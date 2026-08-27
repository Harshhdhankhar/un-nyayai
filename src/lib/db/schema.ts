import {
  pgEnum,
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  jsonb,
  date,
  index,
  uniqueIndex,
  vector,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* =========================================================================
 * NyayAI — full database schema (Drizzle ORM, pgvector enabled)
 * Every table uses UUID primary keys. All user-owned tables carry a
 * `user_id` column for ownership and are protected by RLS (see supabase/).
 * ========================================================================= */

/* ----------------------------- shared enums ----------------------------- */

export const userRole = pgEnum("user_role", ["citizen", "advocate", "admin"]);

export const matterCategory = pgEnum("matter_category", [
  "employment",
  "civil",
  "criminal",
  "consumer",
  "property",
  "family",
  "cyber",
  "commercial",
  "constitutional",
  "other",
]);

export const matterStatus = pgEnum("matter_status", [
  "triage",
  "active",
  "paused",
  "closed",
]);

export const partyRole = pgEnum("party_role", [
  "self",
  "petitioner",
  "respondent",
  "plaintiff",
  "defendant",
  "applicant",
  "complainant",
  "accused",
  "opposite_party",
  "other",
]);

export const eventSource = pgEnum("event_source", [
  "user",
  "document",
  "ecourts",
  "ai",
]);

export const taskStatus = pgEnum("task_status", [
  "todo",
  "in_progress",
  "done",
]);

export const documentKind = pgEnum("document_kind", [
  "fir",
  "legal_notice",
  "court_order",
  "agreement",
  "petition",
  "contract",
  "evidence",
  "judgment",
  "letter",
  "other",
]);

export const documentStatus = pgEnum("document_status", [
  "uploaded",
  "processing",
  "analyzed",
  "failed",
]);

export const evidenceKind = pgEnum("evidence_kind", [
  "text",
  "document",
  "image",
  "other",
]);

export const evidenceStatus = pgEnum("evidence_status", [
  "available",
  "missing",
  "needs_verification",
]);

export const draftKind = pgEnum("draft_kind", [
  "legal_notice",
  "consumer_complaint",
  "rti_application",
  "reply_to_notice",
  "basic_complaint",
  "rent_agreement",
  "employment_representation",
  "delay_objection",
]);

export const draftStatus = pgEnum("draft_status", [
  "draft",
  "review",
  "final",
]);

export const messageRole = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
]);

export const sourceType = pgEnum("source_type", [
  "statute",
  "section",
  "judgment",
  "article",
  "rule",
  "other",
]);

export const verificationStatus = pgEnum("verification_status", [
  "verified",
  "interpretation",
  "needs_verification",
]);

export const mappingPair = pgEnum("mapping_pair", [
  "ipc_bns",
  "crpc_bnss",
  "evidence_bsa",
]);

export const similarityType = pgEnum("similarity_type", [
  "identical",
  "renumbered",
  "amended",
  "new",
  "repealed",
]);

export const caseStatus = pgEnum("case_status", ["pending", "disposed"]);

export const routeStatus = pgEnum("route_status", [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
  "BLOCKED",
  "NEEDS_INFORMATION",
]);

export const nodeType = pgEnum("node_type", [
  "PROBLEM",
  "REMEDY",
  "STATUTE",
  "SECTION",
  "PROCEDURE",
  "AUTHORITY",
  "DOCUMENT",
  "EVIDENCE_TYPE",
  "JUDGMENT",
  "LEGAL_AID_SERVICE",
]);

export const edgeType = pgEnum("edge_type", [
  "HAS_REMEDY",
  "GOVERNED_BY",
  "PART_OF",
  "REQUIRES",
  "INTERPRETS",
  "APPROPRIATE_FOR",
  "NEXT_STEP",
  "NEEDS_EVIDENCE",
  "FILED_AT",
  "APPLIES_TO",
]);

export const aiMode = pgEnum("ai_mode", [
  "simple",
  "detailed",
  "professional",
]);

export const language = pgEnum("language", ["en", "hi", "hinglish"]);

export const organizationRole = pgEnum("organization_role", [
  "owner",
  "member",
  "viewer",
]);

/* ------------------------------- users ---------------------------------- */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  passwordHash: text("password_hash"),
  fullName: text("full_name"),
  phone: text("phone"),
  role: userRole("role").notNull().default("citizen"),
  isDemo: boolean("is_demo").notNull().default(false),
  provider: text("provider").notNull().default("local"), // local | google | supabase
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("users_email_idx").on(t.email),
]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  state: text("state"),
  city: text("city"),
  preferredLanguage: language("preferred_language").notNull().default("en"),
  explanationMode: aiMode("explanation_mode").notNull().default("simple"),
  consentSigned: boolean("consent_signed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("profiles_user_idx").on(t.userId),
]);

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("orgs_slug_idx").on(t.slug),
]);

export const organizationMembers = pgTable("organization_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: organizationRole("role").notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("org_members_unique_idx").on(t.organizationId, t.userId),
]);

/* -------------------------------- matters ------------------------------- */

export const matters = pgTable("matters", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").references(() => organizations.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  description: text("description"),
  matterType: matterCategory("matter_type").notNull().default("other"),
  subCategory: text("sub_category"),
  jurisdiction: text("jurisdiction"),
  court: text("court"),
  cnr: text("cnr"),
  status: matterStatus("status").notNull().default("triage"),
  category: matterCategory("category").notNull().default("other"),
  confidence: numeric("confidence", { precision: 4, scale: 3 }),
  readinessScore: integer("readiness_score").default(0),
  nextAction: text("next_action"),
  language: language("language").notNull().default("en"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("matters_user_idx").on(t.userId),
  index("matters_type_idx").on(t.matterType),
  index("matters_cnr_idx").on(t.cnr),
]);

export const matterParties = pgTable("matter_parties", {
  id: uuid("id").primaryKey().defaultRandom(),
  matterId: uuid("matter_id")
    .notNull()
    .references(() => matters.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: partyRole("role").notNull().default("other"),
  contact: text("contact"),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("matter_parties_matter_idx").on(t.matterId),
]);

export const matterFacts = pgTable("matter_facts", {
  id: uuid("id").primaryKey().defaultRandom(),
  matterId: uuid("matter_id")
    .notNull()
    .references(() => matters.id, { onDelete: "cascade" }),
  fact: text("fact").notNull(),
  kind: text("kind").notNull().default("statement"), // statement | extracted | missing
  confidence: numeric("confidence", { precision: 4, scale: 3 }),
  source: text("source").notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("matter_facts_matter_idx").on(t.matterId),
]);

export const matterEvents = pgTable("matter_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  matterId: uuid("matter_id")
    .notNull()
    .references(() => matters.id, { onDelete: "cascade" }),
  eventDate: date("event_date"),
  title: text("title").notNull(),
  description: text("description"),
  source: eventSource("source").notNull().default("user"),
  confidence: numeric("confidence", { precision: 4, scale: 3 }),
  editable: boolean("editable").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("matter_events_matter_idx").on(t.matterId),
  index("matter_events_date_idx").on(t.matterId, t.eventDate),
]);

export const matterTasks = pgTable("matter_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  matterId: uuid("matter_id")
    .notNull()
    .references(() => matters.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatus("status").notNull().default("todo"),
  dueDate: date("due_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("matter_tasks_matter_idx").on(t.matterId),
]);

export const matterNotes = pgTable("matter_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  matterId: uuid("matter_id")
    .notNull()
    .references(() => matters.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("matter_notes_matter_idx").on(t.matterId),
]);

export const matterSources = pgTable("matter_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  matterId: uuid("matter_id")
    .notNull()
    .references(() => matters.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: sourceType("type").notNull().default("other"),
  authority: text("authority"),
  citation: text("citation"),
  url: text("url"),
  excerpt: text("excerpt"),
  status: verificationStatus("status").notNull().default("needs_verification"),
  retrievedAt: timestamp("retrieved_at", { withTimezone: true }),
  raw: jsonb("raw"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("matter_sources_matter_idx").on(t.matterId),
]);

/* ------------------------------- documents ------------------------------ */

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  matterId: uuid("matter_id").references(() => matters.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  kind: documentKind("kind").notNull().default("other"),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  storagePath: text("storage_path"),
  status: documentStatus("status").notNull().default("uploaded"),
  extractedText: text("extracted_text"),
  /** Character offset where each page starts (index i = page i+1). */
  pageOffsets: jsonb("page_offsets"),
  summary: text("summary"),
  analysis: jsonb("analysis"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("documents_user_idx").on(t.userId),
  index("documents_matter_idx").on(t.matterId),
]);

export const documentChunks = pgTable("document_chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  page: integer("page"),
  embedding: vector("embedding", { dimensions: 1536 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("document_chunks_doc_idx").on(t.documentId),
]);

export const documentEntities = pgTable("document_entities", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // party | date | amount | section | case_number | court | judge | clause | obligation | deadline | risk
  value: text("value").notNull(),
  confidence: numeric("confidence", { precision: 4, scale: 3 }),
  startOffset: integer("start_offset"),
  endOffset: integer("end_offset"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("document_entities_doc_idx").on(t.documentId),
]);

/* --------------------- document analysis (analyzer) ---------------------- */

export const analysisStatus = pgEnum("analysis_status", [
  "queued",
  "running",
  "done",
  "failed",
]);

/**
 * One structured analysis per document. `result` holds the full report
 * (classification, overview, clauses, risks, missing info, PII findings).
 * Status/progress power the processing UI.
 */
export const documentAnalyses = pgTable("document_analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  status: analysisStatus("status").notNull().default("queued"),
  stage: text("stage"),
  progress: integer("progress").notNull().default(0),
  pageCount: integer("page_count"),
  privacyMode: text("privacy_mode").notNull().default("original"), // original | detected | redacted
  redactedText: text("redacted_text"),
  result: jsonb("result"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("document_analyses_doc_idx").on(t.documentId),
]);

/** Chat history scoped to a single uploaded document ("Ask NyayAI"). */
export const documentChatMessages = pgTable("document_chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // user | assistant
  content: text("content").notNull(),
  citations: jsonb("citations"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("document_chat_doc_idx").on(t.documentId),
]);

/* ------------------------------- evidence ------------------------------- */

export const evidenceItems = pgTable("evidence_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  matterId: uuid("matter_id")
    .notNull()
    .references(() => matters.id, { onDelete: "cascade" }),
  documentId: uuid("document_id").references(() => documents.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  kind: evidenceKind("kind").notNull().default("text"),
  status: evidenceStatus("status").notNull().default("available"),
  description: text("description"),
  provenance: text("provenance"),
  suggested: boolean("suggested").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("evidence_matter_idx").on(t.matterId),
]);

/* -------------------------------- drafts -------------------------------- */

export const drafts = pgTable("drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  matterId: uuid("matter_id").references(() => matters.id, {
    onDelete: "cascade",
  }),
  kind: draftKind("kind").notNull().default("basic_complaint"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  status: draftStatus("status").notNull().default("draft"),
  facts: jsonb("facts"),
  sources: jsonb("sources"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("drafts_user_idx").on(t.userId),
  index("drafts_matter_idx").on(t.matterId),
]);

/* -------------------------------- chat ---------------------------------- */

export const chatThreads = pgTable("chat_threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  matterId: uuid("matter_id").references(() => matters.id, {
    onDelete: "cascade",
  }),
  title: text("title").notNull().default("New conversation"),
  mode: aiMode("mode").notNull().default("simple"),
  language: language("language").notNull().default("en"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("chat_threads_user_idx").on(t.userId),
]);

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  threadId: uuid("thread_id")
    .notNull()
    .references(() => chatThreads.id, { onDelete: "cascade" }),
  role: messageRole("role").notNull(),
  content: text("content").notNull(),
  structured: jsonb("structured"),
  sources: jsonb("sources"),
  verification: jsonb("verification"),
  suggestedActions: jsonb("suggested_actions"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("chat_messages_thread_idx").on(t.threadId),
]);

/* --------------------------- verified legal base ------------------------ */

export const legalSources = pgTable("legal_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  type: sourceType("type").notNull().default("other"),
  authority: text("authority"),
  date: date("date"),
  url: text("url"),
  sourceName: text("source_name"),
  version: text("version"),
  effectiveFrom: date("effective_from"),
  jurisdiction: text("jurisdiction"),
  status: verificationStatus("status").notNull().default("needs_verification"),
  retrievedAt: timestamp("retrieved_at", { withTimezone: true }),
  raw: jsonb("raw"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("legal_sources_type_idx").on(t.type),
  index("legal_sources_authority_idx").on(t.authority),
]);

export const statutes = pgTable("statutes", {
  id: uuid("id").primaryKey().defaultRandom(),
  actName: text("act_name").notNull(),
  shortTitle: text("short_title"),
  category: text("category"),
  jurisdiction: text("jurisdiction").notNull().default("India"),
  effectiveDate: date("effective_date"),
  sourceUrl: text("source_url"),
  sourceName: text("source_name").notNull().default("legislative.gov.in"),
  version: text("version").notNull().default("1.0"),
  isRepealed: boolean("is_repealed").notNull().default(false),
  repealedByAct: text("repealed_by_act"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("statutes_act_idx").on(t.actName),
]);

export const sections = pgTable("sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  statuteId: uuid("statute_id")
    .notNull()
    .references(() => statutes.id, { onDelete: "cascade" }),
  actName: text("act_name").notNull(),
  sectionNumber: text("section_number").notNull(),
  heading: text("heading"),
  text: text("text").notNull(),
  jurisdiction: text("jurisdiction").notNull().default("India"),
  effectiveDate: date("effective_date"),
  sourceUrl: text("source_url"),
  sourceName: text("source_name").notNull().default("legislative.gov.in"),
  version: text("version").notNull().default("1.0"),
  embedding: vector("embedding", { dimensions: 1536 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("sections_act_num_idx").on(t.actName, t.sectionNumber),
  index("sections_heading_idx").on(t.heading),
]);

export const lawMappings = pgTable("law_mappings", {
  id: uuid("id").primaryKey().defaultRandom(),
  pair: mappingPair("pair").notNull(),
  oldAct: text("old_act").notNull(),
  oldSection: text("old_section").notNull(),
  oldText: text("old_text"),
  newAct: text("new_act").notNull(),
  newSection: text("new_section").notNull(),
  newText: text("new_text"),
  similarity: similarityType("similarity").notNull().default("renumbered"),
  importantChange: text("important_change"),
  proceduralImpact: text("procedural_impact"),
  verifiedSource: text("verified_source"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("law_mappings_pair_idx").on(t.pair),
  index("law_mappings_old_idx").on(t.oldAct, t.oldSection),
  index("law_mappings_new_idx").on(t.newAct, t.newSection),
]);

export const judgments = pgTable("judgments", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  court: text("court"),
  judge: text("judge"),
  citation: text("citation"),
  caseNumber: text("case_number"),
  decisionDate: date("decision_date"),
  bench: text("bench"),
  summary: text("summary"),
  fullText: text("full_text"),
  documentId: text("document_id"),
  sourceUrl: text("source_url"),
  provenance: text("provenance").notNull().default("manual"),
  embedding: vector("embedding", { dimensions: 1536 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("judgments_court_idx").on(t.court),
  index("judgments_citation_idx").on(t.citation),
]);

/* ------------------------------- eCourts -------------------------------- */

export const caseRecords = pgTable("case_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  matterId: uuid("matter_id").references(() => matters.id, {
    onDelete: "set null",
  }),
  cnr: text("cnr").notNull(),
  courtName: text("court_name"),
  courtCode: text("court_code"),
  caseNumber: text("case_number"),
  caseType: text("case_type"),
  caseStatus: caseStatus("case_status").notNull().default("pending"),
  petitioner: text("petitioner"),
  respondent: text("respondent"),
  judge: text("judge"),
  stage: text("stage"),
  filingDate: date("filing_date"),
  nextHearingDate: date("next_hearing_date"),
  lastOrder: jsonb("last_order"),
  history: jsonb("history"),
  isDemo: boolean("is_demo").notNull().default(false),
  raw: jsonb("raw"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("case_records_cnr_idx").on(t.cnr),
  index("case_records_user_idx").on(t.userId),
]);

export const caseHearings = pgTable("case_hearings", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseRecordId: uuid("case_record_id")
    .notNull()
    .references(() => caseRecords.id, { onDelete: "cascade" }),
  hearingDate: date("hearing_date").notNull(),
  purpose: text("purpose"),
  result: text("result"),
  orderSummary: text("order_summary"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("case_hearings_record_idx").on(t.caseRecordId),
  index("case_hearings_date_idx").on(t.caseRecordId, t.hearingDate),
]);

export const caseOrders = pgTable("case_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseRecordId: uuid("case_record_id")
    .notNull()
    .references(() => caseRecords.id, { onDelete: "cascade" }),
  orderDate: date("order_date").notNull(),
  summary: text("summary").notNull(),
  orderType: text("order_type"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("case_orders_record_idx").on(t.caseRecordId),
]);

/* -------------------- matter intelligence (additive) -------------------- */

/**
 * Point-in-time capture of a matter's eCourts record. Change Intelligence
 * diffs the two most recent snapshots to answer "what changed since your last
 * check?" — deterministically, from stored data (no live call on matter open).
 */
export const caseSnapshots = pgTable("case_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  matterId: uuid("matter_id")
    .notNull()
    .references(() => matters.id, { onDelete: "cascade" }),
  cnr: text("cnr").notNull(),
  mode: text("mode").notNull().default("demo"), // live | demo
  caseStatus: text("case_status"),
  stage: text("stage"),
  nextHearingDate: date("next_hearing_date"),
  petitioner: text("petitioner"),
  respondent: text("respondent"),
  orderCount: integer("order_count"),
  data: jsonb("data").notNull(), // full ECourtCaseDetail at capture time
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("case_snapshots_matter_idx").on(t.matterId),
  index("case_snapshots_captured_idx").on(t.matterId, t.capturedAt),
]);

/**
 * User-provided inputs for the Cost of Delay estimate. Nothing is assumed —
 * the estimate is only shown when the user supplies these figures.
 */
export const matterCostInputs = pgTable("matter_cost_inputs", {
  id: uuid("id").primaryKey().defaultRandom(),
  matterId: uuid("matter_id")
    .notNull()
    .references(() => matters.id, { onDelete: "cascade" }),
  dailyIncomeLost: numeric("daily_income_lost", { precision: 12, scale: 2 }),
  travelCostPerAppearance: numeric("travel_cost_per_appearance", { precision: 12, scale: 2 }),
  otherCostPerAppearance: numeric("other_cost_per_appearance", { precision: 12, scale: 2 }),
  currency: text("currency").notNull().default("INR"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("matter_cost_inputs_matter_idx").on(t.matterId),
]);

/* ---------------------------- legal navigation -------------------------- */

export const legalRoutes = pgTable("legal_routes", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  category: matterCategory("category").notNull().default("other"),
  subCategory: text("sub_category"),
  description: text("description"),
  situationKeywords: jsonb("situation_keywords"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("routes_slug_idx").on(t.slug),
  index("routes_category_idx").on(t.category),
]);

export const routeSteps = pgTable("route_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  routeId: uuid("route_id")
    .notNull()
    .references(() => legalRoutes.id, { onDelete: "cascade" }),
  order: integer("order").notNull(),
  title: text("title").notNull(),
  explanation: text("explanation"),
  whyItMatters: text("why_it_matters"),
  requiredDocuments: jsonb("required_documents"),
  possibleDeadline: text("possible_deadline"),
  source: text("source"),
  actionLabel: text("action_label"),
  actionType: text("action_type"),
  actionPayload: jsonb("action_payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("route_steps_route_idx").on(t.routeId, t.order),
]);

export const matterRouteInstances = pgTable("matter_route_instances", {
  id: uuid("id").primaryKey().defaultRandom(),
  matterId: uuid("matter_id")
    .notNull()
    .references(() => matters.id, { onDelete: "cascade" }),
  routeId: uuid("route_id")
    .notNull()
    .references(() => legalRoutes.id, { onDelete: "cascade" }),
  status: routeStatus("status").notNull().default("NOT_STARTED"),
  currentStepOrder: integer("current_step_order").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("matter_route_matter_idx").on(t.matterId),
  uniqueIndex("matter_route_unique_idx").on(t.matterId, t.routeId),
]);

export const matterRouteStepStates = pgTable("matter_route_step_states", {
  id: uuid("id").primaryKey().defaultRandom(),
  instanceId: uuid("instance_id")
    .notNull()
    .references(() => matterRouteInstances.id, { onDelete: "cascade" }),
  stepOrder: integer("step_order").notNull(),
  status: routeStatus("status").notNull().default("NOT_STARTED"),
  notes: text("notes"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("step_state_instance_idx").on(t.instanceId, t.stepOrder),
]);

/* ------------------------- deadline / limitation ------------------------ */

export const deadlineRules = pgTable("deadline_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  triggerEvent: text("trigger_event").notNull(),
  action: text("action").notNull(),
  duration: integer("duration").notNull(),
  durationUnit: text("duration_unit").notNull(), // days | months | years
  jurisdiction: text("jurisdiction").notNull().default("India"),
  statute: text("statute").notNull(),
  section: text("section"),
  source: text("source").notNull(),
  exceptions: text("exceptions"),
  effectiveFrom: date("effective_from"),
  isLimitationBar: boolean("is_limitation_bar").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("deadline_rules_trigger_idx").on(t.triggerEvent),
]);

/* ----------------------------- knowledge graph -------------------------- */

export const knowledgeNodes = pgTable("knowledge_nodes", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: nodeType("type").notNull(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("knowledge_nodes_slug_idx").on(t.slug),
  index("knowledge_nodes_type_idx").on(t.type),
]);

export const knowledgeEdges = pgTable("knowledge_edges", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceNodeId: uuid("source_node_id")
    .notNull()
    .references(() => knowledgeNodes.id, { onDelete: "cascade" }),
  targetNodeId: uuid("target_node_id")
    .notNull()
    .references(() => knowledgeNodes.id, { onDelete: "cascade" }),
  type: edgeType("type").notNull(),
  weight: numeric("weight", { precision: 4, scale: 3 }).default("1"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("knowledge_edges_source_idx").on(t.sourceNodeId),
  index("knowledge_edges_target_idx").on(t.targetNodeId),
]);

/* ------------------------------- legal aid ------------------------------ */

export const legalAidServices = pgTable("legal_aid_services", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  provider: text("provider").notNull(), // NALSA | SLSA | DLSA | bar_council | clinic | other
  description: text("description"),
  state: text("state"),
  website: text("website"),
  phone: text("phone"),
  address: text("address"),
  serviceType: text("service_type"),
  eligibility: jsonb("eligibility"),
  isOfficial: boolean("is_official").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("legal_aid_provider_idx").on(t.provider),
  index("legal_aid_state_idx").on(t.state),
]);

export const legalAidRules = pgTable("legal_aid_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  criteria: jsonb("criteria").notNull(),
  description: text("description"),
  source: text("source"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("legal_aid_rules_name_idx").on(t.name),
]);

export const legalAidAssessments = pgTable("legal_aid_assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  answers: jsonb("answers").notNull(),
  result: jsonb("result").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("legal_aid_assessments_user_idx").on(t.userId),
]);

/* ------------------------------ audit log ------------------------------- */

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: uuid("entity_id"),
  meta: jsonb("meta"),
  ip: text("ip"),
  requestId: text("request_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("audit_logs_user_idx").on(t.userId),
  index("audit_logs_created_idx").on(t.createdAt),
]);

/* ------------------------------ relations ------------------------------- */

export const mattersRelations = relations(matters, ({ many }) => ({
  parties: many(matterParties),
  facts: many(matterFacts),
  events: many(matterEvents),
  tasks: many(matterTasks),
  notes: many(matterNotes),
  documents: many(documents),
}));
