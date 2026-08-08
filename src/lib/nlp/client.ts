import "server-only";
import { config, hasLegalNlp } from "@/lib/config";
import { logger } from "@/lib/logger";

export interface NlpAnalysis {
  entities: { kind: string; value: string; confidence: number }[];
  obligations: { subject: string; verb: string; object: string }[];
  deadlines: { trigger: string; detail: string }[];
  risks: { level: string; text: string }[];
  summary: string;
}

/**
 * Call the optional legal-NLP microservice. Returns null when it is not
 * configured or unreachable so callers fall back to local analysis.
 */
export async function analyzeWithNlpService(text: string): Promise<NlpAnalysis | null> {
  if (!hasLegalNlp) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(`${config.legalNlpUrl}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language: "en" }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as NlpAnalysis;
  } catch (err) {
    logger.warn("legal_nlp_unavailable", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export async function checkNlpHealth() {
  if (!hasLegalNlp) return { ok: false as const, mode: "unconfigured" as const };
  try {
    const res = await fetch(`${config.legalNlpUrl}/health`, { signal: AbortSignal.timeout(3000) });
    const body = (await res.json()) as { ok?: boolean };
    return { ok: body.ok === true, mode: "live" as const };
  } catch {
    return { ok: false as const, mode: "down" as const };
  }
}
