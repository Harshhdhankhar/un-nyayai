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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.groq.timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.groq.apiKey}`,
      },
      body: JSON.stringify({
        model: config.groq.model,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 2048,
        response_format: options.json ? { type: "json_object" } : undefined,
        messages: [{ role: "system", content: system }, ...messages],
      }),
      signal: controller.signal,
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
  } finally {
    clearTimeout(timeout);
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
  const controller = new AbortController();

  const stream = new ReadableStream<Uint8Array>({
    async start(streamController) {
      const encoder = new TextEncoder();
      const timeout = setTimeout(() => controller.abort(), config.groq.timeoutMs + 30_000);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.groq.apiKey}`,
          },
          body: JSON.stringify({
            model: config.groq.model,
            stream: true,
            temperature: options.temperature ?? 0.2,
            max_tokens: options.maxTokens ?? 2048,
            messages: [{ role: "system", content: system }, ...messages],
          }),
          signal: controller.signal,
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
        const aborted = err instanceof Error && err.name === "AbortError";
        if (!aborted) {
          streamController.error(err);
        }
      } finally {
        clearTimeout(timeout);
      }
    },
    cancel() {
      controller.abort();
    },
  });
  return stream;
}
