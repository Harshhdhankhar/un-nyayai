CREATE TYPE "public"."analysis_status" AS ENUM('queued', 'running', 'done', 'failed');--> statement-breakpoint
CREATE TABLE "document_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"status" "analysis_status" DEFAULT 'queued' NOT NULL,
	"stage" text,
	"progress" integer DEFAULT 0 NOT NULL,
	"page_count" integer,
	"privacy_mode" text DEFAULT 'original' NOT NULL,
	"redacted_text" text,
	"result" jsonb,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"citations" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_analyses" ADD CONSTRAINT "document_analyses_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_chat_messages" ADD CONSTRAINT "document_chat_messages_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_analyses_doc_idx" ON "document_analyses" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_chat_doc_idx" ON "document_chat_messages" USING btree ("document_id");