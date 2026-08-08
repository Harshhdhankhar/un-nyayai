import "server-only";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { legalAidServices } from "@/lib/db/schema";
import type { LegalAidAssessment } from "@/lib/legal/schemas";

/* =========================================================================
 * Legal Aid Navigator — deterministic eligibility triage.
 * NyayAI does NOT provide legal representation; it helps users find official
 * legal-aid channels and clearly marks "needs official confirmation".
 * ========================================================================= */

export const legalAidQuestionnaireSchema = z.object({
  age: z.number().min(1).max(120),
  gender: z.enum(["female", "male", "other", "prefer_not"]).default("prefer_not"),
  annualIncome: z.number().min(0),
  state: z.string().max(80).optional(),
  disability: z.boolean().default(false),
  custody: z.boolean().default(false),
  scheduledCasteOrTribe: z.boolean().default(false),
  womenOrChild: z.boolean().default(false),
  industrialWorkman: z.boolean().default(false),
  victimOfTraffickingOrDisaster: z.boolean().default(false),
});

export type LegalAidQuestionnaire = z.infer<typeof legalAidQuestionnaireSchema>;

const INCOME_THRESHOLD = 300000; // ₹3,00,000/yr — indicative; confirm with SLSA.

export function assessLegalAid(
  answers: LegalAidQuestionnaire
): LegalAidAssessment {
  const reasons: string[] = [];
  let eligible = false;

  if (answers.scheduledCasteOrTribe) {
    eligible = true;
    reasons.push("Persons belonging to Scheduled Castes / Scheduled Tribes are eligible for free legal aid.");
  }
  if (answers.womenOrChild || answers.gender === "female") {
    eligible = true;
    reasons.push("Women and children are eligible for free legal aid.");
  }
  if (answers.disability) {
    eligible = true;
    reasons.push("Persons with disability are eligible for free legal aid.");
  }
  if (answers.custody) {
    eligible = true;
    reasons.push("Persons in custody are eligible for free legal aid.");
  }
  if (answers.industrialWorkman) {
    eligible = true;
    reasons.push("Industrial workmen are eligible for free legal aid.");
  }
  if (answers.victimOfTraffickingOrDisaster) {
    eligible = true;
    reasons.push("Victims of trafficking or mass disaster are eligible for free legal aid.");
  }
  if (answers.annualIncome <= INCOME_THRESHOLD) {
    eligible = true;
    reasons.push(`Annual income is within the indicative eligibility threshold (₹${INCOME_THRESHOLD.toLocaleString("en-IN")}).`);
  }

  const summary = eligible
    ? "Based on your answers, you may be eligible for free legal services through the National/State Legal Services Authorities. Eligibility must be confirmed by the authority."
    : "Based on your answers, you may not qualify under common legal-aid criteria — but you should still check with your District Legal Services Authority (DLSA).";

  return {
    possibleEligibility: eligible,
    summary,
    reasons,
    officialServices: [
      {
        name: "District Legal Services Authority (DLSA)",
        level: "District",
        description: "Provides free legal services, Lok Adalats, and legal awareness.",
      },
      {
        name: "State Legal Services Authority (SLSA)",
        level: "State",
        description: "State-level legal aid body; contact for appeals on eligibility.",
      },
      {
        name: "NALSA",
        level: "National",
        description: "National body; helpline 15100.",
      },
    ],
    suggestedNextStep:
      "Contact your District Legal Services Authority (DLSA) or call the NALSA helpline (15100) with proof of income/eligibility for official confirmation.",
    needsOfficialConfirmation: true,
  };
}

export async function getLegalAidServices(limit = 10) {
  return db.select().from(legalAidServices).limit(limit);
}
