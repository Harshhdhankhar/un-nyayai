import "server-only";
import { z } from "zod";
import { complete, AiUnavailableError } from "./groq";
import { logger } from "@/lib/logger";

/**
 * Structured output helper: requests JSON from the model and validates it
 * against a Zod schema. Falls back to an optional deterministic default when
 * the AI is unavailable (returning null signals the caller to use rules).
 */
export async function completeJSON<T>(
  schema: z.ZodType<T>,
  system: string,
  userContent: string,
  options: {
    temperature?: number;
    fallback?: T;
    maxTokens?: number;
    label?: string;
  } = {}
): Promise<T | null> {
  const label = options.label ?? "structured";
  try {
    const raw = await complete(system, [{ role: "user", content: userContent }], {
      json: true,
      temperature: options.temperature ?? 0.1,
      maxTokens: options.maxTokens,
      label,
    });
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
    const parsed = schema.safeParse(JSON.parse(cleaned));
    if (parsed.success) return parsed.data;
    // One retry with a "fix your JSON" hint.
    const retry = await complete(
      system,
      [
        { role: "user", content: userContent },
        {
          role: "assistant",
          content: raw,
        },
        {
          role: "user",
          content: `Your previous response was not valid. Errors: ${JSON.stringify(
            parsed.error.flatten()
          )}. Respond again with valid JSON matching the required schema.`,
        },
      ],
      { json: true, temperature: 0, maxTokens: options.maxTokens, label: `${label}_retry` }
    );
    const retryCleaned = retry
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
    const retryParsed = schema.safeParse(JSON.parse(retryCleaned));
    if (retryParsed.success) return retryParsed.data;
    logger.warn("structured_output_invalid", {
      issues: JSON.stringify(retryParsed.error.flatten()),
    });
    return options.fallback ?? null;
  } catch (err) {
    if (err instanceof AiUnavailableError) {
      return options.fallback ?? null;
    }
    logger.warn("structured_output_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return options.fallback ?? null;
  }
}
