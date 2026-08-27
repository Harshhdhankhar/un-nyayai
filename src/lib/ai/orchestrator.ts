import "server-only";
import { runTriage, type TriageResult } from "@/lib/legal/triage";
import { hybridRetrieveExpanded, sectionsToEvidencePack } from "@/lib/retrieval/hybrid";
import { retrieveDocumentChunks, chunksToSources } from "@/lib/retrieval/documents";
import { retrieveJudgments, judgmentsToSources } from "@/lib/retrieval/judgments";
import { reciprocalRankFusion, dedupeById, normalizeScores } from "@/lib/retrieval/reranker";
import { prepareRetrievalQueries } from "@/lib/ai/query-rewrite";
import * as kanoon from "@/lib/providers/indian-kanoon";
import { lookupCaseByCnr } from "@/lib/providers/ecourts";
import type { ECourtCaseDetail } from "@/lib/providers/ecourts/types";
import { routeRequest, logRoute, type ToolName } from "@/lib/ai/tool-router";
import type { EvidencePack, ChatResponse } from "@/lib/legal/schemas";
import { canUseAi } from "@/lib/config";
import { logger } from "@/lib/logger";
import {
  EXPLAIN_SYSTEM,
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
  /** Recent conversation turns (oldest → newest, excluding the statement). */
  history?: { role: string; content: string }[];
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
    ecourts: "live" | "demo" | "unconfigured";
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
  const triage = await runTriage(input.statement);

  // 0) Deterministic tool routing.
  const route = routeRequest(input.statement);
  logRoute(route, input.statement);

  // 0b) Query preparation — rewrite conversational follow-ups into
  // self-contained queries and expand into keyword variants.
  const prepared = await prepareRetrievalQueries(
    input.statement,
    input.history ?? []
  );

  // 1) Verified database retrieval (multi-query hybrid: pgvector + FTS → RRF).
  const dbHits = await hybridRetrieveExpanded(prepared.searchQueries, { k: 5 });
  const dbPack = sectionsToEvidencePack(prepared.standalone, dbHits);

  // 1b) Matter document RAG — the user's own uploaded documents.
  let docSources: EvidencePack["sources"] = [];
  // 1c) Verified case-law RAG — landmark judgments stored in the database.
  let judgmentSources: EvidencePack["sources"] = [];
  if (input.userId) {
    const [chunkHits, jHits] = await Promise.all([
      retrieveDocumentChunks(prepared.searchQueries, {
        userId: input.userId,
        matterId: input.matterId,
        k: 4,
      }),
      retrieveJudgments(prepared.searchQueries, 3).catch((err) => {
        logger.warn("judgment_retrieval_failed", {
          error: err instanceof Error ? err.message : String(err),
        });
        return [];
      }),
    ]);
    docSources = chunksToSources(chunkHits);
    judgmentSources = judgmentsToSources(jHits);
  }

  // 2) Tool-specific retrieval.
  const usesLiveResearch =
    route.tool === "research" ||
    (input.useKanoon ?? false) ||
    (input.research ?? false);

  let sources = dbPack.sources;
  const providerStatus: PipelineResult["providerStatus"] = {
    kanoon: "unconfigured",
    ecourts: "unconfigured",
    groq: canUseAi,
  };

  // 2a) CNR / case-status route → pull the official eCourts record so the
  // assistant can answer about the actual case, not just statutes. Demo data
  // is clearly labelled in the source title so it is never mistaken for live.
  let caseSource: EvidencePack["sources"][number] | null = null;
  if (route.tool === "case-status" && route.cnr) {
    try {
      const lookup = await lookupCaseByCnr(route.cnr);
      providerStatus.ecourts = lookup.mode;
      caseSource = caseToSource(lookup.caseData, lookup.mode);
    } catch (err) {
      logger.warn("pipeline_ecourts_lookup_failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (usesLiveResearch) {
    const kanoonSearch = await kanoon.search(prepared.standalone);
    providerStatus.kanoon = kanoonSearch.mode;
    const kanoonSources = kanoonSearch.results.slice(0, 5).map((r) =>
      kanoon.toSourceItem(r, 1)
    );
    sources = fuseSources([dbPack.sources, docSources, judgmentSources, kanoonSources]);
  } else {
    sources = fuseSources([dbPack.sources, docSources, judgmentSources]);
  }

  // The case record is the most specific evidence — keep it first.
  if (caseSource) {
    sources = [caseSource, ...sources.filter((s) => s.id !== caseSource!.id)].slice(0, 10);
  }

  const hasKanoon = sources.some((s) => s.id.startsWith("ik-"));
  const evidencePack: EvidencePack = {
    query: prepared.standalone,
    provider: caseSource
      ? sources.length > 1
        ? "mixed"
        : "ecourts"
      : hasKanoon
        ? "mixed"
        : "database",
    mode:
      providerStatus.kanoon === "live" || providerStatus.ecourts === "live"
        ? "live"
        : "degraded",
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

/** Build an evidence-pack source from an eCourts case record (provenance-safe). */
function caseToSource(
  detail: ECourtCaseDetail,
  mode: "live" | "demo"
): EvidencePack["sources"][number] {
  const r = detail.record;
  const isDemo = mode === "demo";
  const lastHearing = detail.history[detail.history.length - 1];
  const excerpt = [
    `${r.petitioner} vs ${r.respondent}`,
    `Status: ${r.caseStatus}${r.stage ? `, stage: ${r.stage}` : ""}`,
    r.nextHearingDate ? `Next hearing: ${r.nextHearingDate}` : null,
    lastHearing
      ? `Last hearing: ${lastHearing.hearingDate} — ${lastHearing.result || lastHearing.purpose}`
      : null,
  ]
    .filter(Boolean)
    .join(". ");
  return {
    id: `ecourts-${r.cnr}`,
    title: `${isDemo ? "DEMO DATA — " : ""}Case ${r.caseNumber || r.cnr}`,
    type: "case_record",
    authority: r.courtName || undefined,
    date: r.filingDate || undefined,
    citation: `CNR ${r.cnr}`,
    excerpt,
    relevanceScore: 1,
  };
}

/**
 * Fuse evidence from multiple retrieval backends (statutes, user documents,
 * Indian Kanoon) with RRF so ranking reflects relevance, not source order.
 */
function fuseSources(
  lists: EvidencePack["sources"][]
): EvidencePack["sources"] {
  const nonEmpty = lists.filter((l) => l.length > 0);
  if (nonEmpty.length === 0) return [];
  if (nonEmpty.length === 1) return nonEmpty[0];
  // Weight by channel trust: statutes > user documents > judgments > web case law.
  const channelWeights: Record<number, number> = {
    0: 0.7, // statutory sections
    1: 0.65, // user document chunks
    2: 0.6, // verified judgments
    3: 0.5, // Indian Kanoon (external)
  };
  let fused = reciprocalRankFusion(nonEmpty, {
    k: 60,
    weights: nonEmpty.map((_, i) => channelWeights[i] ?? 0.5),
  });
  fused = dedupeById(fused);
  fused = normalizeScores(fused);
  return fused.slice(0, 10).map((r) => ({
    ...r.item,
    relevanceScore: r.score,
  }));
}

/** Deterministic fallback answer used when Groq is unavailable. */
export function buildFallbackAnswer(
  triage: TriageResult,
  pack: EvidencePack
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
    // Filler/pronouns that appear in pure small talk — but NOT question
    // words (what/can/do/help/who/are), so real questions always reach
    // the legal pipeline instead of being answered as greetings.
    "you", "so", "much", "very", "really", "again", "sure",
    "yes", "no", "alright", "nice", "perfect", "well", "done",
    "test", "testing", "haha", "lol", "🙏", "👍", "👋",
  ]);
  return words.every((w) => chatty.has(w));
}
