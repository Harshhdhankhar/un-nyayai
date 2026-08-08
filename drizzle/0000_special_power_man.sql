CREATE TYPE "public"."ai_mode" AS ENUM('simple', 'detailed', 'professional');--> statement-breakpoint
CREATE TYPE "public"."case_status" AS ENUM('pending', 'disposed');--> statement-breakpoint
CREATE TYPE "public"."document_kind" AS ENUM('fir', 'legal_notice', 'court_order', 'agreement', 'petition', 'contract', 'evidence', 'judgment', 'letter', 'other');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('uploaded', 'processing', 'analyzed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."draft_kind" AS ENUM('legal_notice', 'consumer_complaint', 'rti_application', 'reply_to_notice', 'basic_complaint', 'rent_agreement', 'employment_representation');--> statement-breakpoint
CREATE TYPE "public"."draft_status" AS ENUM('draft', 'review', 'final');--> statement-breakpoint
CREATE TYPE "public"."edge_type" AS ENUM('HAS_REMEDY', 'GOVERNED_BY', 'PART_OF', 'REQUIRES', 'INTERPRETS', 'APPROPRIATE_FOR', 'NEXT_STEP', 'NEEDS_EVIDENCE', 'FILED_AT', 'APPLIES_TO');--> statement-breakpoint
CREATE TYPE "public"."event_source" AS ENUM('user', 'document', 'ecourts', 'ai');--> statement-breakpoint
CREATE TYPE "public"."evidence_kind" AS ENUM('text', 'document', 'image', 'other');--> statement-breakpoint
CREATE TYPE "public"."evidence_status" AS ENUM('available', 'missing', 'needs_verification');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('en', 'hi', 'hinglish');--> statement-breakpoint
CREATE TYPE "public"."mapping_pair" AS ENUM('ipc_bns', 'crpc_bnss', 'evidence_bsa');--> statement-breakpoint
CREATE TYPE "public"."matter_category" AS ENUM('employment', 'civil', 'criminal', 'consumer', 'property', 'family', 'cyber', 'commercial', 'constitutional', 'other');--> statement-breakpoint
CREATE TYPE "public"."matter_status" AS ENUM('triage', 'active', 'paused', 'closed');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint
CREATE TYPE "public"."node_type" AS ENUM('PROBLEM', 'REMEDY', 'STATUTE', 'SECTION', 'PROCEDURE', 'AUTHORITY', 'DOCUMENT', 'EVIDENCE_TYPE', 'JUDGMENT', 'LEGAL_AID_SERVICE');--> statement-breakpoint
CREATE TYPE "public"."organization_role" AS ENUM('owner', 'member', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."party_role" AS ENUM('self', 'petitioner', 'respondent', 'plaintiff', 'defendant', 'applicant', 'complainant', 'accused', 'opposite_party', 'other');--> statement-breakpoint
CREATE TYPE "public"."route_status" AS ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'NEEDS_INFORMATION');--> statement-breakpoint
CREATE TYPE "public"."similarity_type" AS ENUM('identical', 'renumbered', 'amended', 'new', 'repealed');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('statute', 'section', 'judgment', 'article', 'rule', 'other');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('todo', 'in_progress', 'done');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('citizen', 'advocate', 'admin');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('verified', 'interpretation', 'needs_verification');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" uuid,
	"meta" jsonb,
	"ip" text,
	"request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_hearings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_record_id" uuid NOT NULL,
	"hearing_date" date NOT NULL,
	"purpose" text,
	"result" text,
	"order_summary" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_record_id" uuid NOT NULL,
	"order_date" date NOT NULL,
	"summary" text NOT NULL,
	"order_type" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"matter_id" uuid,
	"cnr" text NOT NULL,
	"court_name" text,
	"court_code" text,
	"case_number" text,
	"case_type" text,
	"case_status" "case_status" DEFAULT 'pending' NOT NULL,
	"petitioner" text,
	"respondent" text,
	"judge" text,
	"stage" text,
	"filing_date" date,
	"next_hearing_date" date,
	"last_order" jsonb,
	"history" jsonb,
	"is_demo" boolean DEFAULT false NOT NULL,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"structured" jsonb,
	"sources" jsonb,
	"verification" jsonb,
	"suggested_actions" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"matter_id" uuid,
	"title" text DEFAULT 'New conversation' NOT NULL,
	"mode" "ai_mode" DEFAULT 'simple' NOT NULL,
	"language" "language" DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deadline_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trigger_event" text NOT NULL,
	"action" text NOT NULL,
	"duration" integer NOT NULL,
	"duration_unit" text NOT NULL,
	"jurisdiction" text DEFAULT 'India' NOT NULL,
	"statute" text NOT NULL,
	"section" text,
	"source" text NOT NULL,
	"exceptions" text,
	"effective_from" date,
	"is_limitation_bar" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"content" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"page" integer,
	"embedding" vector(1536),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"value" text NOT NULL,
	"confidence" numeric(4, 3),
	"start_offset" integer,
	"end_offset" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"matter_id" uuid,
	"name" text NOT NULL,
	"kind" "document_kind" DEFAULT 'other' NOT NULL,
	"mime_type" text,
	"size_bytes" integer,
	"storage_path" text,
	"status" "document_status" DEFAULT 'uploaded' NOT NULL,
	"extracted_text" text,
	"summary" text,
	"analysis" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"matter_id" uuid,
	"kind" "draft_kind" DEFAULT 'basic_complaint' NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"status" "draft_status" DEFAULT 'draft' NOT NULL,
	"facts" jsonb,
	"sources" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" uuid NOT NULL,
	"document_id" uuid,
	"title" text NOT NULL,
	"kind" "evidence_kind" DEFAULT 'text' NOT NULL,
	"status" "evidence_status" DEFAULT 'available' NOT NULL,
	"description" text,
	"provenance" text,
	"suggested" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "judgments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"court" text,
	"judge" text,
	"citation" text,
	"case_number" text,
	"decision_date" date,
	"bench" text,
	"summary" text,
	"full_text" text,
	"document_id" text,
	"source_url" text,
	"provenance" text DEFAULT 'manual' NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_node_id" uuid NOT NULL,
	"target_node_id" uuid NOT NULL,
	"type" "edge_type" NOT NULL,
	"weight" numeric(4, 3) DEFAULT 1,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "node_type" NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "law_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pair" "mapping_pair" NOT NULL,
	"old_act" text NOT NULL,
	"old_section" text NOT NULL,
	"old_text" text,
	"new_act" text NOT NULL,
	"new_section" text NOT NULL,
	"new_text" text,
	"similarity" "similarity_type" DEFAULT 'renumbered' NOT NULL,
	"important_change" text,
	"procedural_impact" text,
	"verified_source" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_aid_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"answers" jsonb NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_aid_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"criteria" jsonb NOT NULL,
	"description" text,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_aid_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"provider" text NOT NULL,
	"description" text,
	"state" text,
	"website" text,
	"phone" text,
	"address" text,
	"service_type" text,
	"eligibility" jsonb,
	"is_official" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"category" "matter_category" DEFAULT 'other' NOT NULL,
	"sub_category" text,
	"description" text,
	"situation_keywords" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"type" "source_type" DEFAULT 'other' NOT NULL,
	"authority" text,
	"date" date,
	"url" text,
	"source_name" text,
	"version" text,
	"effective_from" date,
	"jurisdiction" text,
	"status" "verification_status" DEFAULT 'needs_verification' NOT NULL,
	"retrieved_at" timestamp with time zone,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matter_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" uuid NOT NULL,
	"event_date" date,
	"title" text NOT NULL,
	"description" text,
	"source" "event_source" DEFAULT 'user' NOT NULL,
	"confidence" numeric(4, 3),
	"editable" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matter_facts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" uuid NOT NULL,
	"fact" text NOT NULL,
	"kind" text DEFAULT 'statement' NOT NULL,
	"confidence" numeric(4, 3),
	"source" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matter_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matter_parties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" uuid NOT NULL,
	"name" text NOT NULL,
	"role" "party_role" DEFAULT 'other' NOT NULL,
	"contact" text,
	"address" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matter_route_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" uuid NOT NULL,
	"route_id" uuid NOT NULL,
	"status" "route_status" DEFAULT 'NOT_STARTED' NOT NULL,
	"current_step_order" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matter_route_step_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_id" uuid NOT NULL,
	"step_order" integer NOT NULL,
	"status" "route_status" DEFAULT 'NOT_STARTED' NOT NULL,
	"notes" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matter_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" uuid NOT NULL,
	"title" text NOT NULL,
	"type" "source_type" DEFAULT 'other' NOT NULL,
	"authority" text,
	"citation" text,
	"url" text,
	"excerpt" text,
	"status" "verification_status" DEFAULT 'needs_verification' NOT NULL,
	"retrieved_at" timestamp with time zone,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matter_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "task_status" DEFAULT 'todo' NOT NULL,
	"due_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"matter_type" "matter_category" DEFAULT 'other' NOT NULL,
	"sub_category" text,
	"jurisdiction" text,
	"court" text,
	"cnr" text,
	"status" "matter_status" DEFAULT 'triage' NOT NULL,
	"category" "matter_category" DEFAULT 'other' NOT NULL,
	"confidence" numeric(4, 3),
	"readiness_score" integer DEFAULT 0,
	"next_action" text,
	"language" "language" DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "organization_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"display_name" text,
	"bio" text,
	"avatar_url" text,
	"state" text,
	"city" text,
	"preferred_language" "language" DEFAULT 'en' NOT NULL,
	"explanation_mode" "ai_mode" DEFAULT 'simple' NOT NULL,
	"consent_signed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "route_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"route_id" uuid NOT NULL,
	"order" integer NOT NULL,
	"title" text NOT NULL,
	"explanation" text,
	"why_it_matters" text,
	"required_documents" jsonb,
	"possible_deadline" text,
	"source" text,
	"action_label" text,
	"action_type" text,
	"action_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"statute_id" uuid NOT NULL,
	"act_name" text NOT NULL,
	"section_number" text NOT NULL,
	"heading" text,
	"text" text NOT NULL,
	"jurisdiction" text DEFAULT 'India' NOT NULL,
	"effective_date" date,
	"source_url" text,
	"source_name" text DEFAULT 'legislative.gov.in' NOT NULL,
	"version" text DEFAULT '1.0' NOT NULL,
	"embedding" vector(1536),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "statutes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"act_name" text NOT NULL,
	"short_title" text,
	"category" text,
	"jurisdiction" text DEFAULT 'India' NOT NULL,
	"effective_date" date,
	"source_url" text,
	"source_name" text DEFAULT 'legislative.gov.in' NOT NULL,
	"version" text DEFAULT '1.0' NOT NULL,
	"is_repealed" boolean DEFAULT false NOT NULL,
	"repealed_by_act" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"password_hash" text,
	"full_name" text,
	"phone" text,
	"role" "user_role" DEFAULT 'citizen' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"provider" text DEFAULT 'local' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_hearings" ADD CONSTRAINT "case_hearings_case_record_id_case_records_id_fk" FOREIGN KEY ("case_record_id") REFERENCES "public"."case_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_orders" ADD CONSTRAINT "case_orders_case_record_id_case_records_id_fk" FOREIGN KEY ("case_record_id") REFERENCES "public"."case_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_records" ADD CONSTRAINT "case_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_records" ADD CONSTRAINT "case_records_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_thread_id_chat_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."chat_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_entities" ADD CONSTRAINT "document_entities_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drafts" ADD CONSTRAINT "drafts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drafts" ADD CONSTRAINT "drafts_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_edges" ADD CONSTRAINT "knowledge_edges_source_node_id_knowledge_nodes_id_fk" FOREIGN KEY ("source_node_id") REFERENCES "public"."knowledge_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_edges" ADD CONSTRAINT "knowledge_edges_target_node_id_knowledge_nodes_id_fk" FOREIGN KEY ("target_node_id") REFERENCES "public"."knowledge_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_aid_assessments" ADD CONSTRAINT "legal_aid_assessments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_events" ADD CONSTRAINT "matter_events_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_facts" ADD CONSTRAINT "matter_facts_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_notes" ADD CONSTRAINT "matter_notes_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_notes" ADD CONSTRAINT "matter_notes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_parties" ADD CONSTRAINT "matter_parties_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_route_instances" ADD CONSTRAINT "matter_route_instances_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_route_instances" ADD CONSTRAINT "matter_route_instances_route_id_legal_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."legal_routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_route_step_states" ADD CONSTRAINT "matter_route_step_states_instance_id_matter_route_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."matter_route_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_sources" ADD CONSTRAINT "matter_sources_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_tasks" ADD CONSTRAINT "matter_tasks_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matters" ADD CONSTRAINT "matters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matters" ADD CONSTRAINT "matters_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_steps" ADD CONSTRAINT "route_steps_route_id_legal_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."legal_routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_statute_id_statutes_id_fk" FOREIGN KEY ("statute_id") REFERENCES "public"."statutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_user_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "case_hearings_record_idx" ON "case_hearings" USING btree ("case_record_id");--> statement-breakpoint
CREATE INDEX "case_hearings_date_idx" ON "case_hearings" USING btree ("case_record_id","hearing_date");--> statement-breakpoint
CREATE INDEX "case_orders_record_idx" ON "case_orders" USING btree ("case_record_id");--> statement-breakpoint
CREATE UNIQUE INDEX "case_records_cnr_idx" ON "case_records" USING btree ("cnr");--> statement-breakpoint
CREATE INDEX "case_records_user_idx" ON "case_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chat_messages_thread_idx" ON "chat_messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "chat_threads_user_idx" ON "chat_threads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "deadline_rules_trigger_idx" ON "deadline_rules" USING btree ("trigger_event");--> statement-breakpoint
CREATE INDEX "document_chunks_doc_idx" ON "document_chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_entities_doc_idx" ON "document_entities" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "documents_user_idx" ON "documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "documents_matter_idx" ON "documents" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "drafts_user_idx" ON "drafts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "drafts_matter_idx" ON "drafts" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "evidence_matter_idx" ON "evidence_items" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "judgments_court_idx" ON "judgments" USING btree ("court");--> statement-breakpoint
CREATE INDEX "judgments_citation_idx" ON "judgments" USING btree ("citation");--> statement-breakpoint
CREATE INDEX "knowledge_edges_source_idx" ON "knowledge_edges" USING btree ("source_node_id");--> statement-breakpoint
CREATE INDEX "knowledge_edges_target_idx" ON "knowledge_edges" USING btree ("target_node_id");--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_nodes_slug_idx" ON "knowledge_nodes" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "knowledge_nodes_type_idx" ON "knowledge_nodes" USING btree ("type");--> statement-breakpoint
CREATE INDEX "law_mappings_pair_idx" ON "law_mappings" USING btree ("pair");--> statement-breakpoint
CREATE INDEX "law_mappings_old_idx" ON "law_mappings" USING btree ("old_act","old_section");--> statement-breakpoint
CREATE INDEX "law_mappings_new_idx" ON "law_mappings" USING btree ("new_act","new_section");--> statement-breakpoint
CREATE INDEX "legal_aid_assessments_user_idx" ON "legal_aid_assessments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "legal_aid_rules_name_idx" ON "legal_aid_rules" USING btree ("name");--> statement-breakpoint
CREATE INDEX "legal_aid_provider_idx" ON "legal_aid_services" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "legal_aid_state_idx" ON "legal_aid_services" USING btree ("state");--> statement-breakpoint
CREATE UNIQUE INDEX "routes_slug_idx" ON "legal_routes" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "routes_category_idx" ON "legal_routes" USING btree ("category");--> statement-breakpoint
CREATE INDEX "legal_sources_type_idx" ON "legal_sources" USING btree ("type");--> statement-breakpoint
CREATE INDEX "legal_sources_authority_idx" ON "legal_sources" USING btree ("authority");--> statement-breakpoint
CREATE INDEX "matter_events_matter_idx" ON "matter_events" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "matter_events_date_idx" ON "matter_events" USING btree ("matter_id","event_date");--> statement-breakpoint
CREATE INDEX "matter_facts_matter_idx" ON "matter_facts" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "matter_notes_matter_idx" ON "matter_notes" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "matter_parties_matter_idx" ON "matter_parties" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "matter_route_matter_idx" ON "matter_route_instances" USING btree ("matter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "matter_route_unique_idx" ON "matter_route_instances" USING btree ("matter_id","route_id");--> statement-breakpoint
CREATE INDEX "step_state_instance_idx" ON "matter_route_step_states" USING btree ("instance_id","step_order");--> statement-breakpoint
CREATE INDEX "matter_sources_matter_idx" ON "matter_sources" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "matter_tasks_matter_idx" ON "matter_tasks" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "matters_user_idx" ON "matters" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "matters_type_idx" ON "matters" USING btree ("matter_type");--> statement-breakpoint
CREATE INDEX "matters_cnr_idx" ON "matters" USING btree ("cnr");--> statement-breakpoint
CREATE UNIQUE INDEX "org_members_unique_idx" ON "organization_members" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orgs_slug_idx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_user_idx" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "route_steps_route_idx" ON "route_steps" USING btree ("route_id","order");--> statement-breakpoint
CREATE UNIQUE INDEX "sections_act_num_idx" ON "sections" USING btree ("act_name","section_number");--> statement-breakpoint
CREATE INDEX "sections_heading_idx" ON "sections" USING btree ("heading");--> statement-breakpoint
CREATE UNIQUE INDEX "statutes_act_idx" ON "statutes" USING btree ("act_name");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");