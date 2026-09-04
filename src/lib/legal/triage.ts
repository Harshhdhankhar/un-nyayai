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

  // Triage output is a dozen short fields; reserving 2k completion tokens for
  // it would eat the per-minute budget the answer itself needs.
  const llm = await completeJSON(triageSchema, TRIAGE_SYSTEM, text, {
    temperature: 0.1,
    maxTokens: 900,
    label: "triage",
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
    /**
     * Category resolution. The LLM sees nuance keywords cannot, so it wins by
     * default — but not over a confident keyword verdict. A landlord/lease/TPA
     * question that the model labels "criminal" must not reach the user as
     * "a criminal matter, file an FIR", so a strong deterministic match
     * (several distinct keywords agreeing) requires high LLM confidence to
     * override, and the pathway hints follow whichever category won.
     */
    category:
      llm.confidence >= (rule.strong ? 0.75 : 0.4) && llm.category !== "other"
        ? llm.category
        : fallback.category,
    subCategory: llm.subCategory || fallback.subCategory,
  };

  if (merged.category === fallback.category && merged.category !== llm.category) {
    // Deterministic category won: the LLM's pathways describe a different area
    // of law, so they would contradict the category we are presenting.
    merged.possiblePathways = fallback.possiblePathways;
    merged.subCategory = fallback.subCategory;
  }
  return merged;
}

export type { TriageResult };
