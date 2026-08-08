import { z } from "zod";

/* =========================================================================
 * Zod schemas for AI structured outputs and API payloads.
 * Every AI-generated structure is validated against these before use.
 * ========================================================================= */

export const categorySchema = z.enum([
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

export type LegalCategory = z.infer<typeof categorySchema>;

export const partySchema = z.object({
  name: z.string(),
  role: z.enum([
    "self",
    "employer",
    "employee",
    "landlord",
    "tenant",
    "seller",
    "buyer",
    "service_provider",
    "consumer",
    "police",
    "government",
    "opposite_party",
    "unknown",
  ]).default("unknown"),
  description: z.string().optional(),
});

export const factSchema = z.object({
  fact: z.string(),
  kind: z.enum(["statement", "extracted", "missing"]).default("statement"),
});

/** Structured output of the Legal Triage Engine. */
export const triageSchema = z.object({
  category: categorySchema,
  subCategory: z.string().default(""),
  confidence: z.number().min(0).max(1),
  summary: z.string().default(""),
  facts: z.array(factSchema).default([]),
  parties: z.array(partySchema).default([]),
  dates: z
    .array(z.object({ label: z.string(), date: z.string().optional() }))
    .default([]),
  amounts: z
    .array(
      z.object({
        label: z.string(),
        amount: z.number().optional(),
        currency: z.string().default("INR"),
      })
    )
    .default([]),
  location: z.string().default(""),
  availableEvidence: z.array(z.string()).default([]),
  missingFacts: z.array(z.string()).default([]),
  possiblePathways: z.array(z.string()).default([]),
  followUpQuestions: z.array(z.string()).max(4).default([]),
  emergencyFlag: z
    .object({
      isEmergency: z.boolean().default(false),
      reason: z.string().optional(),
    })
    .default({ isEmergency: false }),
});

export type TriageResult = z.infer<typeof triageSchema>;

/** A search query for Indian Kanoon generated from a user question. */
export const searchQuerySchema = z.object({
  queries: z.array(z.string()).max(3),
  keywords: z.array(z.string()).default([]),
});

export type SearchQueryResult = z.infer<typeof searchQuerySchema>;

/** Reranked, deduplicated evidence pack sent to the LLM. */
export const sourceItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.string(),
  authority: z.string().optional(),
  date: z.string().optional(),
  citation: z.string().optional(),
  excerpt: z.string().optional(),
  url: z.string().optional(),
  relevanceScore: z.number().min(0).max(1).optional(),
});

export const evidencePackSchema = z.object({
  query: z.string(),
  sources: z.array(sourceItemSchema),
  provider: z.enum(["database", "indian_kanoon", "documents", "ecourts", "mixed"]),
  mode: z.enum(["live", "mock", "degraded"]),
  retrievedAt: z.string(),
});

export type EvidencePack = z.infer<typeof evidencePackSchema>;

/** Verification layer: every important claim gets a status. */
export const verificationSchema = z.object({
  status: z.enum(["verified", "interpretation", "needs_verification"]),
  reasoning: z.string().optional(),
});

export type Verification = z.infer<typeof verificationSchema>;

export const claimSchema = z.object({
  text: z.string(),
  verification: verificationSchema,
  sourceIds: z.array(z.string()).default([]),
});

/** The dynamic chat response structure. */
export const chatResponseSchema = z.object({
  understanding: z.string(),
  missingInformation: z.array(z.string()).default([]),
  possiblePathways: z.array(z.string()).default([]),
  relevantLaw: z.array(z.string()).default([]),
  sources: z.array(sourceItemSchema).default([]),
  nextAction: z.string(),
  verificationNote: z.string().optional(),
  suggestedActions: z.array(z.string()).default([]),
  safetyNotice: z.string().optional(),
});

export type ChatResponse = z.infer<typeof chatResponseSchema>;

/** Legal aid assessment result. */
export const legalAidAssessmentSchema = z.object({
  possibleEligibility: z.boolean(),
  summary: z.string(),
  reasons: z.array(z.string()),
  officialServices: z
    .array(
      z.object({
        name: z.string(),
        level: z.string(),
        description: z.string(),
      })
    )
    .default([]),
  suggestedNextStep: z.string(),
  needsOfficialConfirmation: z.boolean().default(true),
});

export type LegalAidAssessment = z.infer<typeof legalAidAssessmentSchema>;

/** Document entity extraction. */
export const documentEntitySchema = z.object({
  parties: z.array(partySchema).default([]),
  dates: z.array(z.string()).default([]),
  amounts: z.array(z.string()).default([]),
  sections: z.array(z.string()).default([]),
  caseNumbers: z.array(z.string()).default([]),
  court: z.string().optional(),
  judge: z.string().optional(),
  obligations: z.array(z.string()).default([]),
  deadlines: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  summary: z.string().default(""),
});

export type DocumentEntityResult = z.infer<typeof documentEntitySchema>;
