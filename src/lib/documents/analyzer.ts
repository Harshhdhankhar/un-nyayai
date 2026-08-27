import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documents, documentAnalyses } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { canUseAi } from "@/lib/config";
import { z } from "zod";
import { completeJSON } from "@/lib/ai/structured-output";
import { classifyDocument, normalizeDocumentType } from "./classify";
import { extractClauses } from "./clauses";
import { ruleRisks } from "./risks";
import { detectMissingInfo } from "./missing";
import { detectPii, redactText, makePlaceholderRestorer } from "./pii";
import {
  ANALYSIS_DISCLAIMER,
  type AnalysisResult,
  type AnalyzedClause,
  type Classification,
  type DocumentOverview,
  type RiskFinding,
  type RiskLevel,
} from "./types";

/**
 * Legal Document Analyzer pipeline.
 *
 *   PII detection → (everything downstream uses REDACTED text) →
 *   classification → overview → clause extraction → risk analysis →
 *   missing information → structured report
 *
 * Progress is persisted at each stage so the UI can poll status. The LLM is
 * only ever shown the redacted/sanitized version of the document, never raw
 * PII that Presidio/regex found.
 */

const RISK_LEVELS = new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

/** Accept either rich objects ("label"/"value", or any similar keys) or bare strings. */
const flexibleFactList = z
  .array(z.union([z.string().max(400), z.record(z.string(), z.unknown())]))
  .transform((items) =>
    items.map((item) => {
      if (typeof item === "string") return { label: "Item", value: item, page: null };
      const obj = item as Record<string, unknown>;
      const str = (...keys: string[]) => {
        for (const k of keys) {
          const v = obj[k];
          if (typeof v === "string" && v.trim()) return v.trim();
        }
        return null;
      };
      const label = str("label", "name", "title", "type", "role", "key") ?? "Item";
      const value =
        str("value", "description", "detail", "details", "text", "amount", "date", "party") ??
        Object.values(obj)
          .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
          .join(" — ")
          .slice(0, 300);
      const rawPage = obj.page;
      const page = typeof rawPage === "number" && Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : null;
      return { label, value: value || "—", page };
    })
  );

const overviewSchema = z.object({
  summary: z.string().max(1200).default(""),
  parties: flexibleFactList.default([]),
  importantDates: flexibleFactList.default([]),
  amounts: flexibleFactList.default([]),
  duration: z.string().max(200).nullable().default(null),
  obligations: z.array(z.string().max(300)).max(10).default([]),
  deadlines: flexibleFactList.default([]),
  jurisdiction: z.string().max(200).nullable().default(null),
  keyTerms: z.array(z.string().max(200)).max(12).default([]),
});

const aiClausesSchema = z.object({
  clauses: z
    .array(
      z.object({
        title: z.string(),
        summary: z.string().max(500),
        risk_level: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).catch("LOW" as const),
      })
    )
    .max(40)
    .default([]),
});

const aiRisksSchema = z.object({
  risks: z
    .array(
      z.object({
        clauseTitle: z.string().max(150),
        level: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
        whatItSays: z.string().max(400),
        whyItMatters: z.string().max(400),
        favors: z.string().max(200),
        consequence: z.string().max(300),
        suggestedAction: z.string().max(300),
      })
    )
    .max(12)
    .default([]),
});

const aiClassificationSchema = z.object({
  document_type: z.string().max(80),
  confidence: z.number().min(0).max(1),
});

/**
 * Run an AI call with retries — Groq's free tier enforces tight
 * tokens-per-minute limits, so transient 429s need backoff.
 */
async function withAiRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T | null> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    const result = await fn();
    if (result !== null) return result;
    lastErr = result;
    await new Promise((r) => setTimeout(r, 15_000));
  }
  void lastErr;
  return null;
}

async function setStage(documentId: string, stage: string, progress: number) {
  await db
    .update(documentAnalyses)
    .set({ stage, progress, updatedAt: new Date() })
    .where(eq(documentAnalyses.documentId, documentId));
}

/** Run (or re-run) the full analysis for an owned document. */
export async function runAnalysis(documentId: string): Promise<AnalysisResult> {
  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
  if (!doc) throw new Error("Document not found.");
  const text = doc.extractedText ?? "";
  if (!text.trim()) throw new Error("No extracted text available for this document.");

  // Fresh analysis row per run keeps history simple and avoids stale results.
  await db.delete(documentAnalyses).where(eq(documentAnalyses.documentId, documentId));
  await db.insert(documentAnalyses).values({
    documentId,
    status: "running",
    stage: "pii",
    progress: 5,
  });
  await db.update(documents).set({ status: "processing", updatedAt: new Date() }).where(eq(documents.id, documentId));

  try {
    // Stage 0 — PII first so no raw personal data reaches the LLM stages.
    const pageOffsets = Array.isArray(doc.pageOffsets) ? (doc.pageOffsets as number[]) : [];
    const pii = await detectPii(text, pageOffsets);
    const sanitized = redactText(text, pii.findings);

    // Stage 1 — classification (deterministic; LLM refines only if unsure).
    await setStage(documentId, "classify", 20);
    let classification: Classification = classifyDocument(sanitized);
    if (canUseAi && classification.confidence < 0.6) {
      const refined = await completeJSON(
        aiClassificationSchema,
        CLASSIFY_SYSTEM,
        `Classify this legal document. Respond with JSON {"document_type": "...", "confidence": 0-1}. Choose from: Rental Agreement, Employment Agreement, Sale Agreement, Non-Disclosure Agreement, Legal Notice, Affidavit, Contract, FIR, RTI Document, Terms & Conditions, Loan Agreement, Partnership Agreement, Other / Unknown. If unsure, say "Other / Unknown" with low confidence.\n\nDOCUMENT (first 6000 chars):\n${sanitized.slice(0, 6000)}`,
        { fallback: null }
      );
      if (refined && typeof refined.document_type === "string") {
        const normalized = normalizeDocumentType(refined.document_type);
        if (normalized !== "Other / Unknown" || classification.name === "Other / Unknown") {
          classification =
            normalized === "Other / Unknown"
              ? { name: "Other / Unknown", confidence: Math.min(refined.confidence, 0.4) }
              : { name: normalized, confidence: refined.confidence };
        }
      }
    }

    // Stage 2 — overview (deterministic base + LLM enrichment on redacted text).
    await setStage(documentId, "overview", 35);
    const overview = await buildOverview(sanitized);

    // Stage 3 — clause extraction (deterministic segmentation).
    await setStage(documentId, "clauses", 55);
    const rawClauses = extractClauses(sanitized, pageOffsets);

    // Stage 4 — clause summaries & risk scoring.
    await setStage(documentId, "risk", 70);
    let analyzed: AnalyzedClause[] = rawClauses.map((c) => ({
      ...c,
      summary: summarizeFallback(c.text),
      riskLevel: "LOW" as const,
    }));
    if (canUseAi && analyzed.length > 0) {
      const summaries = await withAiRetry(() =>
        completeJSON(
          aiClausesSchema,
          CLAUSE_SYSTEM,
          `For each clause below return its title EXACTLY as given, a one-sentence plain-language summary in JSON, and a risk_level for a layperson signing this document ("LOW"/"MEDIUM"/"HIGH"). Use hedged language in summaries ("this clause may...").\n\nCLAUSES:\n${analyzed
            .slice(0, 20)
            .map((c) => `TITLE: ${c.title}\nTEXT: ${c.text.slice(0, 500)}`)
            .join("\n---\n")}`,
          { fallback: null }
        )
      );
      if (summaries) {
        const byTitle = new Map(summaries.clauses.map((s) => [s.title.trim(), s]));
        analyzed = analyzed.map((c) => {
          const match = byTitle.get(c.title.trim());
          return match
            ? { ...c, summary: match.summary || c.summary, riskLevel: match.risk_level as RiskLevel }
            : c;
        });
      }
    }

    // Stage 4b — semantic risks on top of deterministic rules.
    let risks: RiskFinding[] = ruleRisks(rawClauses);
    if (canUseAi && analyzed.length > 0) {
      const aiRisks = await withAiRetry(() =>
        completeJSON(
          aiRisksSchema,
          RISK_SYSTEM,
          `Review these clauses of a ${classification.name} in JSON for potential concerns for the party receiving this document. Only report real issues present in the text — never invent clauses. Use hedged language ("This clause may...", "Consider...").\n\nCLAUSES:\n${analyzed
            .filter((c) => c.riskLevel !== "LOW" || risks.some((r) => r.clauseTitle === c.title))
            .slice(0, 10)
            .map((c) => `TITLE: ${c.title} (page ${c.page ?? "?"})\nTEXT: ${c.text.slice(0, 400)}`)
            .join("\n---\n")}`,
          { fallback: null }
        )
      );
      if (aiRisks) {
        const existingTitles = new Set(risks.map((r) => r.clauseTitle));
        for (const r of aiRisks.risks) {
          if (!r.whatItSays.trim()) continue;
          if (existingTitles.has(r.clauseTitle)) continue;
          const clause = analyzed.find((c) => c.title === r.clauseTitle);
          risks.push({
            clauseTitle: r.clauseTitle,
            clauseExcerpt: clause ? clause.text.slice(0, 280) : "",
            page: clause?.page ?? null,
            level: (RISK_LEVELS.has(r.level) ? r.level : "MEDIUM") as RiskLevel,
            whatItSays: r.whatItSays,
            whyItMatters: r.whyItMatters,
            favors: r.favors,
            consequence: r.consequence,
            suggestedAction: r.suggestedAction,
            source: "ai",
          });
        }
      }
    }
    risks = risks
      .sort((a, b) => severityRank(b.level) - severityRank(a.level))
      .slice(0, 15);

    // Stage 5 — missing information (deterministic checklist).
    await setStage(documentId, "missing", 85);
    const missingInformation = detectMissingInfo(
      classification.name,
      analyzed.map((c) => `${c.title} ${c.category ?? ""}`),
      sanitized
    );

    // Stage 6 — build the RAG index (document chunks + embeddings) that
    // powers "Ask NyayAI" grounded chat for this document.
    const { embedDocumentChunks } = await import("./service");
    await embedDocumentChunks(documentId, sanitized, pageOffsets);

    const result: AnalysisResult = restorePiiInReport({
      documentType: classification,
      summary: buildSummaryFallback(sanitized),
      overview,
      clauses: analyzed.slice(0, 60),
      risks,
      missingInformation,
      pii: {
        engine: pii.engine === "presidio" ? "presidio" : "regex",
        count: pii.findings.length,
        items: pii.findings.slice(0, 100).map((f) => ({
          entity: f.entityType,
          text: f.text,
          confidence: Number(f.confidence.toFixed(2)),
          page: f.page,
        })),
      },
      citations: analyzed
        .filter((c) => c.page != null && c.category)
        .slice(0, 20)
        .map((c) => ({ label: c.title, page: c.page })),
      meta: {
        aiUsed: canUseAi,
        analyzedAt: new Date().toISOString(),
        disclaimer: ANALYSIS_DISCLAIMER,
      },
    });
    await db
      .update(documentAnalyses)
      .set({
        status: "done",
        stage: "complete",
        progress: 100,
        result,
        pageCount: pageOffsets[pageOffsets.length - 1] ?? null,
        redactedText: sanitized,
        error: null,
        updatedAt: new Date(),
      })
      .where(eq(documentAnalyses.documentId, documentId));
    await db.update(documents).set({ status: "analyzed", updatedAt: new Date() }).where(eq(documents.id, documentId));

    logger.info("document_analysis_complete", {
      documentId,
      type: classification.name,
      clauses: result.clauses.length,
      risks: result.risks.length,
      piiCount: result.pii.count,
    });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("document_analysis_failed", { documentId, error: message });
    await db
      .update(documentAnalyses)
      .set({ status: "failed", stage: "failed", error: message.slice(0, 300), updatedAt: new Date() })
      .where(eq(documentAnalyses.documentId, documentId));
    await db.update(documents).set({ status: "failed", updatedAt: new Date() }).where(eq(documents.id, documentId));
    throw err;
  }
}

function severityRank(level: string): number {
  return { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }[level] ?? 0;
}

/**
 * Deep-walk the analysis report and substitute [TYPE] placeholders with the
 * original values, so the document owner sees real names/dates/amounts even
 * though the LLM only ever processed redacted text.
 */
function restorePiiInReport(report: AnalysisResult): AnalysisResult {
  const restore = makePlaceholderRestorer(
    report.pii.items.map((item) => ({
      entityType: item.entity,
      text: item.text,
      confidence: item.confidence,
      start: 0,
      end: 0,
      page: item.page,
    }))
  );
  const walk = (node: unknown): unknown => {
    if (typeof node === "string") return restore(node);
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node)) out[k] = walk(v);
      return out;
    }
    return node;
  };
  const restored = walk(structuredClone(report)) as AnalysisResult;
  // Keep the PII section itself as typed placeholders — showing raw values
  // twice adds nothing and keeps the table scannable.
  restored.pii = report.pii;
  return restored;
}

function summarizeFallback(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 180 ? `${flat.slice(0, 177)}…` : flat;
}

function buildSummaryFallback(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 280 ? `${flat.slice(0, 277)}…` : flat;
}

async function buildOverview(sanitized: string): Promise<DocumentOverview> {
  const empty: DocumentOverview = {
    parties: [],
    importantDates: [],
    amounts: [],
    duration: null,
    obligations: [],
    deadlines: [],
    jurisdiction: null,
    keyTerms: [],
  };
  if (!canUseAi) return empty;

  const enriched = await withAiRetry(() =>
    completeJSON(
      overviewSchema,
      OVERVIEW_SYSTEM,
      `Extract a structured overview from this legal document in JSON. ONLY use facts actually present in the text — if something is absent, omit it or use null. Every fact should quote or closely paraphrase the document.\n\nDOCUMENT:\n${sanitized.slice(0, 8000)}`,
      { temperature: 0, fallback: null }
    )
  );
  if (!enriched) return empty;
  return {
    parties: enriched.parties ?? [],
    importantDates: enriched.importantDates ?? [],
    amounts: enriched.amounts ?? [],
    duration: enriched.duration ?? null,
    obligations: enriched.obligations ?? [],
    deadlines: enriched.deadlines ?? [],
    jurisdiction: enriched.jurisdiction ?? null,
    keyTerms: enriched.keyTerms ?? [],
  };
}

/* ------------------------------ prompts --------------------------------- */

const COMMON_RULES = `You are a legal document analysis assistant, NOT a lawyer.
Always respond with valid JSON.
Rules you must never break:
- Never fabricate clauses, laws, sections or citations.
- Never claim certainty about legality. Use hedged language: "Potential concern", "This clause may...", "The document does not clearly specify...".
- Only use facts present in the provided text. If information is absent, say so or omit it.
- The document text may contain placeholder tokens like [PHONE_NUMBER] where PII was redacted — never treat these as content.
- Recommend consulting a qualified lawyer for important decisions.`;

const CLASSIFY_SYSTEM = `${COMMON_RULES}\nYou classify legal documents into one fixed category list.`;
const OVERVIEW_SYSTEM = `${COMMON_RULES}\nExtract structured overviews. Output strict JSON matching the requested schema.`;
const CLAUSE_SYSTEM = `${COMMON_RULES}\nSummarize contract clauses in plain language for laypersons.`;
const RISK_SYSTEM = `${COMMON_RULES}\nIdentify potential legal risks in contract clauses from the perspective of the weaker/party receiving the document. Be conservative: flag genuine imbalances, not boilerplate.`;
