import "server-only";
import { complete } from "@/lib/ai/groq";
import { canUseAi } from "@/lib/config";
import { logger } from "@/lib/logger";

/**
 * Retrieval query preparation.
 *
 * Conversational follow-ups ("what about my notice period?") are ambiguous on
 * their own. Before retrieval we:
 *   1. rewrite the latest message into a self-contained query using recent
 *      conversation turns, and
 *   2. expand it into a small set of keyword variants so hybrid retrieval can
 *      match both conceptual and lexical phrasings (multi-query expansion).
 *
 * Falls back to a deterministic heuristic when live AI is unavailable, so
 * retrieval never blocks on the LLM.
 */

const REWRITE_SYSTEM = `You prepare search queries for a legal knowledge-base retrieval system (Indian law).
Given the recent conversation and the user's latest message, produce:
- "standalone": the latest message rewritten as ONE self-contained search query. Resolve pronouns using conversation context. Keep it under 30 words. Never invent facts not present in the conversation.
- "variants": exactly 2 alternative phrasings emphasizing different legal keywords/statute terms (e.g. "security deposit refund", "rent agreement eviction notice").
Respond with JSON: {"standalone": "...", "variants": ["...", "..."]}`;

export interface PreparedQuery {
  /** Self-contained primary query used for semantic search + display. */
  standalone: string;
  /** All queries (standalone + variants) fed into hybrid retrieval channels. */
  searchQueries: string[];
  source: "ai" | "heuristic";
}

/** Deterministic offline fallback: strip filler, keep content words. */
function heuristicPrepare(message: string): PreparedQuery {
  const cleaned = message
    .replace(/[?!.,;:"']/g, " ")
    .replace(
      /\b(what|about|the|a|an|is|are|was|were|do|does|did|i|my|me|you|can|could|should|would|please|tell|and|for|to|of|in|on|it|this|that)\b/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
  const compact = cleaned.length >= 8 ? cleaned : message.trim();
  return {
    standalone: message.trim(),
    searchQueries: [message.trim(), compact].filter(
      (q, i, arr) => q && arr.indexOf(q) === i
    ),
    source: "heuristic",
  };
}

export async function prepareRetrievalQueries(
  message: string,
  history: { role: string; content: string }[] = []
): Promise<PreparedQuery> {
  if (!canUseAi) return heuristicPrepare(message);

  // Only bother with an LLM rewrite when history exists or the message is
  // short/ambiguous enough that expansion could help.
  const transcript = history
    .slice(-6)
    .map((m) => `${m.role}: ${m.content.slice(0, 300)}`)
    .join("\n");

  try {
    const raw = await complete(
      REWRITE_SYSTEM,
      [
        {
          role: "user",
          content: `Recent conversation:\n${transcript || "(none)"}\n\nLatest message: ${message}`,
        },
      ],
      { json: true, temperature: 0, maxTokens: 300 }
    );
    const parsed = JSON.parse(raw) as {
      standalone?: string;
      variants?: string[];
    };
    const standalone =
      typeof parsed.standalone === "string" && parsed.standalone.trim()
        ? parsed.standalone.trim().slice(0, 400)
        : message.trim();
    const variants = (parsed.variants ?? [])
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .map((v) => v.trim().slice(0, 200))
      .slice(0, 2);
    const searchQueries = [standalone, ...variants].filter(
      (q, i, arr) => q && arr.indexOf(q) === i
    );
    logger.info("query_rewritten", { source: "ai", variants: variants.length });
    return { standalone, searchQueries, source: "ai" };
  } catch (err) {
    logger.warn("query_rewrite_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return heuristicPrepare(message);
  }
}
