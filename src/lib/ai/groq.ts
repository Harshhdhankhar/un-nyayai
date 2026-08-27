import "server-only";
import { config, canUseAi } from "@/lib/config";
import { logger } from "@/lib/logger";

export class AiUnavailableError extends Error {
  constructor() {
    super("AI provider not configured.");
    this.name = "AiUnavailableError";
  }
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOptions {
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  /** Reasoning effort for reasoning models (e.g. gpt-oss). Lower keeps answers fast. */
  reasoningEffort?: "low" | "medium" | "high";
}

const RATE_LIMIT_RETRIES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * POST to Groq, transparently retrying transient failures (429 rate limits,
 * 503 overload) with backoff. Free-tier accounts have tight tokens-per-minute
 * caps, so a single 429 must not fail the request outright.
 */
async function fetchCompletion(
  url: string,
  body: Record<string, unknown>
): Promise<Response> {
  let lastRes: Response | null = null;
  for (let attempt = 0; attempt <= RATE_LIMIT_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.groq.timeoutMs);
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.groq.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (res.ok || ![429, 503].includes(res.status)) return res;
    lastRes = res;
    const retryAfterHeader = Number(res.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
      ? Math.min(retryAfterHeader * 1000, 20_000)
      : Math.min(4000 * (attempt + 1), 15_000);
    logger.warn("groq_rate_limited_retry", { status: res.status, attempt: attempt + 1, waitMs });
    await sleep(waitMs);
  }
  return lastRes!;
}

/**
 * Minimal, dependency-free Groq client (OpenAI-compatible chat completions).
 * Never used as a source of legal truth — only for extraction, explanation,
 * drafting and summarization over retrieved, verified material.
 */
export async function complete(
  system: string,
  messages: ChatMessage[],
  options: CompletionOptions = {}
): Promise<string> {
  if (!canUseAi) {
    throw new AiUnavailableError();
  }
  const url = `${config.groq.baseUrl}/chat/completions`;
  try {
    const res = await fetchCompletion(url, {
      model: config.groq.model,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 2048,
      response_format: options.json ? { type: "json_object" } : undefined,
      reasoning_effort: options.reasoningEffort ?? "low",
      messages: [{ role: "system", content: system }, ...messages],
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.error("groq_error", { status: res.status, body: body.slice(0, 300) });
      throw new Error(`Groq request failed (${res.status}).`);
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty Groq response.");
    return content;
  } catch (err) {
    if (err instanceof AiUnavailableError) throw err;
    logger.error("groq_complete_error", {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/** Streaming chat completions as an SSE-friendly ReadableStream. */
export function streamComplete(
  system: string,
  messages: ChatMessage[],
  options: CompletionOptions = {}
): ReadableStream<Uint8Array> {
  if (!canUseAi) {
    throw new AiUnavailableError();
  }
  const url = `${config.groq.baseUrl}/chat/completions`;

  const stream = new ReadableStream<Uint8Array>({
    async start(streamController) {
      const encoder = new TextEncoder();
      try {
        // Retries happen BEFORE any bytes are streamed to the client, so a
        // rate-limited first attempt never produces a partial answer.
        const res = await fetchCompletion(url, {
          model: config.groq.model,
          stream: true,
          temperature: options.temperature ?? 0.2,
          max_tokens: options.maxTokens ?? 2048,
          reasoning_effort: options.reasoningEffort ?? "low",
          messages: [{ role: "system", content: system }, ...messages],
        });
        if (!res.ok || !res.body) {
          const body = await res.text().catch(() => "");
          logger.error("groq_stream_error", { status: res.status, body: body.slice(0, 200) });
          throw new Error(`Groq stream failed (${res.status}).`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          // SSE lines: "data: {...}\n\n"
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const parsed = JSON.parse(payload) as {
                choices?: { delta?: { content?: string } }[];
              };
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                streamController.enqueue(encoder.encode(delta));
              }
            } catch {
              // ignore partial JSON lines
            }
          }
        }
        streamController.close();
      } catch (err) {
        // Always propagate (including timeouts/aborts) so consumers can
        // surface a fallback instead of hanging on a never-ending stream.
        streamController.error(err);
      }
    },
  });
  return stream;
}
