import "server-only";
import { triageSchema, type TriageResult } from "@/lib/legal/schemas";
import { classifyByKeywords } from "@/lib/legal/classification";
import { completeJSON } from "@/lib/ai/structured-output";
import { TRIAGE_SYSTEM } from "@/lib/ai/prompts";
import { sanitizeText } from "@/lib/security";

/**
 * Legal Triage Engine.
 *
 * Pipeline:
 *  1. Deterministic keyword classification (always available).
 *  2. LLM structured extraction (when Groq configured) — validated by Zod.
 *  3. Merge: LLM result wins for facts, rules fill follow-up questions.
 *
 * Never returns a definitive legal conclusion — only a categorization with
 * questions and pathway hints, flagged as such.
 */
export async function runTriage(input: string): Promise<TriageResult> {
  const text = sanitizeText(input);
  const rule = classifyByKeywords(text);

  const fallback: TriageResult = {
    category: rule.category,
    subCategory: rule.subCategory,
    confidence: 0.5,
    summary: "",
    facts: [{ fact: text, kind: "statement" }],
    parties: [],
    dates: [],
    amounts: [],
    location: "",
    availableEvidence: [],
    missingFacts: [],
    possiblePathways: rule.pathwayHints.slice(0, 3),
    followUpQuestions: rule.followUpQuestions.slice(0, 4),
    emergencyFlag: { isEmergency: false },
  };

  const llm = await completeJSON(triageSchema, TRIAGE_SYSTEM, text, {
    temperature: 0.1,
  });

  if (!llm) return fallback;

  // Merge: trust LLM for extracted facts, ensure follow-up questions exist.
  const merged: TriageResult = {
    ...llm,
    facts:
      llm.facts.length > 0
        ? llm.facts
        : [{ fact: text, kind: "statement" as const }],
    possiblePathways:
      llm.possiblePathways.length > 0
        ? llm.possiblePathways
        : fallback.possiblePathways,
    followUpQuestions:
      llm.followUpQuestions.length > 0
        ? llm.followUpQuestions.slice(0, 4)
        : fallback.followUpQuestions.slice(0, 4),
    // keep deterministic category if LLM is unsure
    category:
      llm.confidence >= 0.4 && llm.category !== "other"
        ? llm.category
        : fallback.category,
    subCategory: llm.subCategory || fallback.subCategory,
  };
  return merged;
}

export type { TriageResult };
