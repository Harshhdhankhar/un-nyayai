ALTER TYPE "public"."draft_kind" ADD VALUE 'delay_objection';--> statement-breakpoint
CREATE TABLE "case_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" uuid NOT NULL,
	"cnr" text NOT NULL,
	"mode" text DEFAULT 'demo' NOT NULL,
	"case_status" text,
	"stage" text,
	"next_hearing_date" date,
	"petitioner" text,
	"respondent" text,
	"order_count" integer,
	"data" jsonb NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matter_cost_inputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matter_id" uuid NOT NULL,
	"daily_income_lost" numeric(12, 2),
	"travel_cost_per_appearance" numeric(12, 2),
	"other_cost_per_appearance" numeric(12, 2),
	"currency" text DEFAULT 'INR' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "knowledge_edges" ALTER COLUMN "weight" SET DEFAULT '1';--> statement-breakpoint
ALTER TABLE "case_snapshots" ADD CONSTRAINT "case_snapshots_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_cost_inputs" ADD CONSTRAINT "matter_cost_inputs_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "case_snapshots_matter_idx" ON "case_snapshots" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "case_snapshots_captured_idx" ON "case_snapshots" USING btree ("matter_id","captured_at");--> statement-breakpoint
CREATE UNIQUE INDEX "matter_cost_inputs_matter_idx" ON "matter_cost_inputs" USING btree ("matter_id");