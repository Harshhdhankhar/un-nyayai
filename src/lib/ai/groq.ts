import "server-only";
import { config, canUseAi } from "@/lib/config";
import { logger } from "@/lib/logger";

export class AiUnavailableError extends Error {
  constructor() {
    super("AI provider not configured.");
    this.name = "AiUnavailableError";
  }
}

/**
 * The provider rejected the request as too large for the account's
 * tokens-per-minute allowance, even after we shrank it. Distinct from a
 * transient rate limit: retrying the same payload can never succeed.
 */
export class AiRequestTooLargeError extends Error {
  constructor(readonly detail: string) {
    super(`AI request exceeded the provider token budget. ${detail}`);
    this.name = "AiRequestTooLargeError";
  }
}

/**
 * Conservative token estimate. Groq bills `prompt + max_tokens` against the
 * per-minute budget *before* generating, so an over-large `max_tokens` alone
 * can trigger a 429. English legal prose runs ~3.6 chars/token; we assume 3.4
 * to stay on the safe side of the limit.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.4);
}

/** Estimated prompt tokens for an assembled request, including role overhead. */
function promptTokens(messages: ChatMessage[]): number {
  return messages.reduce((n, m) => n + estimateTokens(m.content) + 4, 0);
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
  /** Short call-site name, used only for log correlation. */
  label?: string;
}

const RATE_LIMIT_RETRIES = 3;
/** How many times we shrink an over-large payload before giving up. */
const SHRINK_ATTEMPTS = 2;
/** Never generate fewer than this many tokens — below it answers are useless. */
const MIN_MAX_TOKENS = 700;

/**
 * A 429 has two very different meanings on Groq:
 *   - "you are sending too fast"  → waiting helps
 *   - "this single request is larger than your per-minute allowance"
 *     ("Request too large for model X ... on tokens per minute (TPM):
 *      Limit 8000, Requested 9800") → waiting can NEVER help
 * Only the second kind needs the payload to shrink, so they are handled apart.
 */
function isTooLarge(body: string): boolean {
  return /request too large|reduce your message size|too large for model/i.test(body);
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n[…truncated to fit the model's token budget.]`;
}

/**
 * Drop the request under the provider's ceiling: first give back reserved
 * completion tokens (cheapest — costs no context), then trim the largest
 * message, which is always the system prompt with the evidence pack appended.
 */
function shrinkRequest(body: Record<string, unknown>): Record<string, unknown> {
  const messages = [...((body.messages as ChatMessage[]) ?? [])];
  const currentMax = Number(body.max_tokens ?? 2048);
  const nextMax = Math.max(MIN_MAX_TOKENS, Math.floor(currentMax * 0.6));

  let target = -1;
  let longest = 0;
  messages.forEach((m, i) => {
    if (m.content.length > longest) {
      longest = m.content.length;
      target = i;
    }
  });
  if (target >= 0 && longest > 2000) {
    messages[target] = {
      ...messages[target],
      content: truncate(messages[target].content, Math.floor(longest * 0.5)),
    };
  }
  return { ...body, max_tokens: nextMax, messages };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * POST to Groq, transparently recovering from transient failures (429 rate
 * limits, 503 overload) with backoff, and from "request too large" 429s by
 * shrinking the payload. Free-tier accounts have tight tokens-per-minute caps,
 * so neither a burst nor one big evidence pack may fail the request outright.
 */
async function fetchCompletion(
  url: string,
  body: Record<string, unknown>
): Promise<Response> {
  let payload = body;
  let lastRes: Response | null = null;
  let shrinks = 0;

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
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (res.ok || ![429, 503].includes(res.status)) return res;

    // Read the body once: it is what distinguishes "slow down" from "too big".
    const text = await res.text().catch(() => "");
    lastRes = new Response(text, { status: res.status, headers: res.headers });

    if (res.status === 429 && isTooLarge(text)) {
      if (shrinks >= SHRINK_ATTEMPTS) {
        logger.error("groq_request_too_large", { body: text.slice(0, 300) });
        throw new AiRequestTooLargeError(text.slice(0, 300));
      }
      shrinks += 1;
      payload = shrinkRequest(payload);
      logger.warn("groq_shrink_retry", {
        attempt: shrinks,
        maxTokens: payload.max_tokens,
        promptTokens: promptTokens((payload.messages as ChatMessage[]) ?? []),
      });
      continue; // immediately — waiting would not help a too-large request
    }

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
 * Fit a request inside the account's per-minute token budget *before* sending.
 * Shrink-on-429 is the safety net; this is the seatbelt. Trimming order is
 * chosen by what costs the answer least:
 *   1. reserved completion tokens (costs no context at all)
 *   2. oldest conversation turns (the live question is always the last one)
 *   3. the tail of the system prompt — the evidence pack sits there, while the
 *      grounding and safety rules sit at the head and must survive
 */
function applyTokenBudget(
  system: string,
  messages: ChatMessage[],
  maxTokens: number,
  label: string
): { system: string; messages: ChatMessage[]; maxTokens: number } {
  const budget = Math.max(2000, config.groq.tokenBudget);
  const outMax = Math.min(maxTokens, Math.max(MIN_MAX_TOKENS, budget - 1200));
  const ceiling = budget - outMax;

  let sys = system;
  const msgs = [...messages];
  const used = () => estimateTokens(sys) + promptTokens(msgs);

  while (msgs.length > 1 && used() > ceiling) msgs.shift();

  const overflow = used() - ceiling;
  if (overflow > 0) {
    sys = truncate(sys, Math.max(1800, sys.length - Math.ceil(overflow * 3.4)));
  }
  const stillOver = used() - ceiling;
  if (stillOver > 0 && msgs.length > 0) {
    const last = msgs[msgs.length - 1];
    msgs[msgs.length - 1] = {
      ...last,
      content: truncate(
        last.content,
        Math.max(500, last.content.length - Math.ceil(stillOver * 3.4))
      ),
    };
  }

  if (sys.length !== system.length || msgs.length !== messages.length || outMax !== maxTokens) {
    logger.info("groq_prompt_budgeted", {
      label,
      budget,
      maxTokens: outMax,
      droppedTurns: messages.length - msgs.length,
      systemTrimmed: sys.length !== system.length,
      estPromptTokens: used(),
    });
  }
  return { system: sys, messages: msgs, maxTokens: outMax };
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
  const budgeted = applyTokenBudget(
    system,
    messages,
    options.maxTokens ?? 2048,
    options.label ?? "complete"
  );
  try {
    const res = await fetchCompletion(url, {
      model: config.groq.model,
      temperature: options.temperature ?? 0.2,
      max_tokens: budgeted.maxTokens,
      response_format: options.json ? { type: "json_object" } : undefined,
      reasoning_effort: options.reasoningEffort ?? "low",
      messages: [{ role: "system", content: budgeted.system }, ...budgeted.messages],
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.error("groq_error", { status: res.status, body: body.slice(0, 300) });
      throw new Error(`Groq request failed (${res.status}). ${body.slice(0, 200)}`);
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
  const budgeted = applyTokenBudget(
    system,
    messages,
    options.maxTokens ?? 2048,
    options.label ?? "stream"
  );

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
          max_tokens: budgeted.maxTokens,
          reasoning_effort: options.reasoningEffort ?? "low",
          messages: [{ role: "system", content: budgeted.system }, ...budgeted.messages],
        });
        if (!res.ok || !res.body) {
          const body = await res.text().catch(() => "");
          logger.error("groq_stream_error", { status: res.status, body: body.slice(0, 300) });
          throw new Error(`Groq stream failed (${res.status}). ${body.slice(0, 200)}`);
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
