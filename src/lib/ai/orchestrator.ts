import "server-only";
import { runTriage, type TriageResult } from "@/lib/legal/triage";
import { hybridRetrieve, sectionsToEvidencePack } from "@/lib/retrieval/hybrid";
import { retrieveDocumentChunks, chunksToSources } from "@/lib/retrieval/documents";
import * as kanoon from "@/lib/providers/indian-kanoon";
import { routeRequest, logRoute, type ToolName } from "@/lib/ai/tool-router";
import type { EvidencePack, ChatResponse } from "@/lib/legal/schemas";
import { canUseAi } from "@/lib/config";
import { logger } from "@/lib/logger";
import {
  EXPLAIN_SYSTEM,
  CHAT_SYSTEM,
  languageInstruction,
  modeInstruction,
} from "@/lib/ai/prompts";

/* =========================================================================
 * AI Orchestrator — deterministic, stateful pipeline.
 *
 * receive_request → route (tool router) → triage → retrieve_sources
 *                   → build_evidence_pack → generate_response
 *                   → verify_claims → persist_matter
 *
 * Prefer deterministic routing; the LLM is only used for explanation over
 * retrieved, verified material.
 * ========================================================================= */

export interface PipelineInput {
  statement: string;
  language?: "en" | "hi" | "hinglish";
  mode?: "simple" | "detailed" | "professional";
  research?: boolean;
  useKanoon?: boolean;
  userId?: string;
  matterId?: string;
}

export interface PipelineResult {
  triage: TriageResult;
  evidencePack: EvidencePack;
  providerStatus: {
    kanoon: "live" | "mock" | "unconfigured";
    groq: boolean;
  };
  route: {
    tool: ToolName;
    reason: string;
    cnr?: string;
  };
}

export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {
  const start = performance.now();
  const triage = await runTriage(input.statement, input.language ?? "en");

  // 0) Deterministic tool routing.
  const route = routeRequest(input.statement);
  logRoute(route, input.statement);

  // 1) Verified database retrieval.
  const dbHits = await hybridRetrieve(input.statement, { k: 5 });
  const dbPack = sectionsToEvidencePack(input.statement, dbHits);

  // 1b) Matter document RAG — the user's own uploaded documents.
  let docSources: EvidencePack["sources"] = [];
  if (input.userId) {
    const chunkHits = await retrieveDocumentChunks(input.statement, {
      userId: input.userId,
      matterId: input.matterId,
      k: 4,
    });
    docSources = chunksToSources(chunkHits);
  }

  // 2) Tool-specific retrieval.
  const usesLiveResearch =
    route.tool === "research" ||
    (input.useKanoon ?? false) ||
    (input.research ?? false);

  let sources = dbPack.sources;
  const providerStatus: PipelineResult["providerStatus"] = {
    kanoon: "unconfigured",
    groq: canUseAi,
  };

  if (usesLiveResearch) {
    const kanoonSearch = await kanoon.search(input.statement);
    providerStatus.kanoon = kanoonSearch.mode;
    const kanoonSources = kanoonSearch.results.slice(0, 5).map((r) =>
      kanoon.toSourceItem(r, 1)
    );
    sources = mergeSources(mergeSources(dbPack.sources, docSources), kanoonSources);
  } else {
    sources = mergeSources(dbPack.sources, docSources);
  }

  const evidencePack: EvidencePack = {
    query: input.statement,
    provider: sources.some((s) => s.id.startsWith("ik-"))
      ? "mixed"
      : "database",
    mode: providerStatus.kanoon === "live" ? "live" : "degraded",
    retrievedAt: new Date().toISOString(),
    sources,
  };

  logger.info("pipeline_complete", {
    ms: Math.round(performance.now() - start),
    category: triage.category,
    tool: route.tool,
    sources: sources.length,
  });

  return { triage, evidencePack, providerStatus, route };
}

function mergeSources(dbSources: EvidencePack["sources"], kanoonSources: EvidencePack["sources"]) {
  const seen = new Set(dbSources.map((s) => s.title.toLowerCase()));
  const merged = [...dbSources];
  for (const s of kanoonSources) {
    if (!seen.has(s.title.toLowerCase())) {
      merged.push(s);
      seen.add(s.title.toLowerCase());
    }
  }
  return merged.slice(0, 10);
}

/** Deterministic fallback answer used when Groq is unavailable. */
export function buildFallbackAnswer(
  triage: TriageResult,
  pack: EvidencePack,
  language = "en"
): ChatResponse {
  const understanding =
    triage.summary ||
    (triage.facts.length > 0
      ? `We understand this as a ${triage.category} matter: ${triage.facts[0].fact}.`
      : `We've categorised this as a ${triage.category} matter.`);

  const relevantLaw = pack.sources.map((s) => s.title);

  const nextAction =
    triage.possiblePathways[0] ??
    "Collect the documents you have and tell us more so we can build a clearer path.";

  return {
    understanding,
    missingInformation: triage.missingFacts,
    possiblePathways: triage.possiblePathways,
    relevantLaw,
    sources: pack.sources,
    nextAction,
    verificationNote:
      "Live AI explanation is unavailable right now. This answer is based on our verified knowledge base and your description — please verify important points with an official source or qualified professional.",
    suggestedActions: triage.followUpQuestions.slice(0, 3),
  };
}

/** Build the system prompt for a given mode/language. */
export function buildAssistantSystem(
  language: string,
  mode: string
): string {
  return `${EXPLAIN_SYSTEM}\n\n${languageInstruction(language)}\n${modeInstruction(mode)}`;
}

/** Detect greetings / small-talk that should not trigger legal research. */
export function isChattyMessage(message: string): boolean {
  const trimmed = message.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "");
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  if (words.length > 8) return false;
  const chatty = new Set([
    "hi", "hello", "hey", "yo", "namaste", "namaskar", "hola",
    "thanks", "thank", "thankyou", "thank-you", "ty", "thx",
    "good", "morning", "afternoon", "evening", "welcome",
    "ok", "okay", "k", "fine", "great", "awesome", "cool",
    "bye", "goodbye", "bye-bye", "goodnight", "good-night",
    "who", "are", "you", "what", "can", "you", "do", "help",
    "test", "testing", "haha", "lol", "yes", "no", "sure",
    "ok", "okay", "alright", "nice", "perfect", "well", "done",
    "much", "so", "very", "really", "again", "for", "this", "a",
    "🙏", "👍", "👋",
  ]);
  return words.every((w) => chatty.has(w));
}
