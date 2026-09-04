import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { z } from "zod";
import { runPipeline, buildFallbackAnswer, buildAssistantSystem, isChattyMessage } from "@/lib/ai/orchestrator";
import { CHAT_SYSTEM, languageInstruction, modeInstruction, UNTRUSTED_DATA_RULE, evidencePackBlock } from "@/lib/ai/prompts";
import { streamComplete, complete, AiRequestTooLargeError } from "@/lib/ai/groq";
import { canUseAi } from "@/lib/config";
import { getOrCreateThread, saveMessage, getThreadMessages } from "@/lib/matters/chat";
import { attachSourceFooter, verifyClaims } from "@/lib/ai/verification";
import { rateLimit, rateLimitKey, clientIp } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";

const ASSISTANT_LIMIT = 25;
const ASSISTANT_WINDOW_MS = 60_000;

const assistantSchema = z.object({
  message: z.string().min(1).max(4000),
  threadId: z.string().uuid().optional(),
  matterId: z.string().uuid().optional(),
  mode: z.enum(["simple", "detailed", "professional"]).default("detailed"),
  language: z.enum(["en", "hi", "hinglish"]).default("en"),
  research: z.boolean().default(false),
  context: z
    .object({
      pathname: z.string().optional(),
      pageType: z.string().optional(),
      matterId: z.string().optional(),
      documentId: z.string().optional(),
      contextSummary: z.string().optional(),
    })
    .optional(),
});

const encoder = new TextEncoder();

function sse(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: NextRequest) {
  const user = await requireApiUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const limited = rateLimit(
    rateLimitKey(clientIp(request), user.id, "assistant"),
    ASSISTANT_LIMIT,
    ASSISTANT_WINDOW_MS
  );
  if (!limited.ok) {
    return Response.json(
      { ok: false, error: "Too many requests. Please wait a moment and try again." },
      {
        status: 429,
        headers: {
          "Retry-After": String(limited.retryAfterSeconds ?? 1),
          "X-RateLimit-Remaining": String(limited.remaining),
        },
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request payload." }, { status: 400 });
  }
  const parsed = assistantSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data." },
      { status: 400 }
    );
  }

  const { message, mode, language, research, context } = parsed.data;
  const isChat = isChattyMessage(message);

  const thread = await getOrCreateThread({
    userId: user.id,
    threadId: parsed.data.threadId,
    matterId: parsed.data.matterId || context?.matterId,
    title: isChat ? "New conversation" : message.slice(0, 60),
    mode,
    language,
  });

  await saveMessage({ threadId: thread.id, role: "user", content: message });

  // Conversation memory — load prior turns so the assistant maintains continuity.
  const history = await getThreadMessages(thread.id);
  const priorTurns = history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  // Kept deliberately tight: prompt tokens and reserved completion tokens are
  // charged against the same per-minute provider budget, and an unbounded
  // transcript pushed whole requests past it (the request then 429s no matter
  // how often it is retried). Six turns is enough for continuity.
  const contextMessages = priorTurns.slice(-4).map((m) => ({
    role: m.role,
    content: m.content.length > 800 ? `${m.content.slice(0, 800)}…` : m.content,
  }));

  // Small-talk greeting path
  if (isChat) {
    const chatSystem = `${CHAT_SYSTEM}\n\n${languageInstruction(language)}\n${modeInstruction(mode)}`;
    const metaPayload = {
      sources: [],
      providerStatus: { kanoon: "unconfigured", groq: canUseAi },
      route: { tool: "chat", reason: "Greeting or small talk" },
      threadId: thread.id,
      isChat: true,
    };

    const readable = new ReadableStream({
      async start(controller) {
        controller.enqueue(
          sse("meta", {
            ...metaPayload,
            mode: canUseAi ? "live" : "offline",
          })
        );
        if (!canUseAi) {
          const reply = `✦ **Hello!** I'm NyayAI, your legal navigation assistant. What legal scenario, contract clause, or court matter can I help you explore today?`;
          await saveMessage({ threadId: thread.id, role: "assistant", content: reply, structured: { chat: true } });
          controller.enqueue(sse("delta", { text: reply }));
          controller.enqueue(sse("done", { threadId: thread.id }));
          controller.close();
          return;
        }
        try {
          const aiStream = streamComplete(chatSystem, contextMessages, {
            temperature: 0.7,
            maxTokens: 400,
          });
          const reader = aiStream.getReader();
          const decoder = new TextDecoder();
          let full = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = decoder.decode(value, { stream: true });
            full += text;
            controller.enqueue(sse("delta", { text }));
          }
          await saveMessage({ threadId: thread.id, role: "assistant", content: full, structured: { chat: true } });
          controller.enqueue(sse("done", { threadId: thread.id }));
          controller.close();
        } catch (err) {
          logger.error("assistant_chat_stream_error", {
            error: err instanceof Error ? err.message : String(err),
          });
          const reply = `✦ **Hello!** I'm NyayAI. Tell me about your legal situation, notice, or agreement, and I will guide you through the applicable Indian laws.`;
          await saveMessage({ threadId: thread.id, role: "assistant", content: reply, structured: { chat: true } });
          controller.enqueue(sse("delta", { text: reply }));
          controller.enqueue(sse("done", { threadId: thread.id }));
          controller.close();
        }
      },
    });
    return new Response(readable, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }

  // Multi-step pipeline: Triage -> Retrieval -> Evidence Pack
  const priorTurnsForRetrieval = priorTurns.slice(0, -1);
  const pipeline = await runPipeline({
    statement: message,
    history: priorTurnsForRetrieval,
    language,
    mode,
    research,
    useKanoon: research,
    userId: user.id,
    matterId: parsed.data.matterId || context?.matterId,
  });

  // Inject Context Awareness into System Prompt
  let contextInstruction = "";
  if (context?.pageType || context?.pathname) {
    contextInstruction = `\nUSER CONTEXT:\n- Active Workspace Screen: ${context.pageType ?? "General Workspace"}\n- URL Path: ${context.pathname ?? "/app"}\n${context.contextSummary ? `- Context Detail: ${context.contextSummary}` : ""}\nProvide answers that actively align with this workspace context.`;
  }

  /**
   * Render an evidence pack for the prompt. `limit`/`chars` exist because the
   * provider charges prompt tokens against a per-minute budget shared with
   * triage and retrieval: ten 600-character excerpts is enough on its own to
   * push the request over a free-tier ceiling, which returns a 429 that
   * retrying cannot clear. Sources are already relevance-ranked, so taking the
   * head of the list keeps the best evidence.
   */
  function packBlock(limit: number, chars: number): string {
    const body =
      pipeline.evidencePack.sources
        .slice(0, limit)
        .map((s, i) => {
          const head = `[${i + 1}] ${s.title} (${s.type})${s.authority ? `, ${s.authority}` : ""}${s.date ? `, ${s.date}` : ""}`;
          const excerpt = (s.excerpt ?? "").replace(/\s+/g, " ").trim();
          return excerpt ? `${head}\n${excerpt.slice(0, chars)}` : head;
        })
        .join("\n\n") || "No verified sources retrieved.";
    return evidencePackBlock("EVIDENCE PACK", body);
  }

  const system = `${buildAssistantSystem(language, mode)}${contextInstruction}\n\n${UNTRUSTED_DATA_RULE}\n\n${packBlock(6, 420)}`;

  /** Deliberately small prompt for the non-streaming recovery attempt. */
  const compactSystem = `${buildAssistantSystem(language, mode)}\n\n${UNTRUSTED_DATA_RULE}\n\n${packBlock(3, 240)}`;

  const metaPayload = {
    triage: pipeline.triage,
    sources: pipeline.evidencePack.sources,
    providerStatus: pipeline.providerStatus,
    route: pipeline.route,
    threadId: thread.id,
    contextBadge: context?.pageType,
  };

  /**
   * Persist a message without ever letting a storage failure escape. Used only
   * on the recovery paths: they run inside the stream's own catch block, so an
   * exception there would leave the SSE response open and hang the client.
   */
  async function safeSave(args: Parameters<typeof saveMessage>[0]): Promise<void> {
    try {
      await saveMessage(args);
    } catch (err) {
      logger.error("assistant_save_failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /** Full deterministic answer layout, shared by the offline and recovery paths. */
  function renderFallbackBody(answer: ReturnType<typeof buildFallbackAnswer>): string {
    return [
      `### Short Answer`,
      `${answer.understanding}`,
      "",
      ...(answer.possiblePathways.length > 0
        ? ["### What Matters", ...answer.possiblePathways.map((p) => `- ${p}`), ""]
        : []),
      ...(answer.relevantLaw.length > 0
        ? ["### Applicable Law", ...answer.relevantLaw.map((r) => `- **${r}**`), ""]
        : []),
      "### What You Can Do",
      `1. ${answer.nextAction}`,
      ...(answer.missingInformation.length > 0
        ? ["", "### What Could Change the Answer", ...answer.missingInformation.map((m) => `- ${m}`)]
        : []),
      "",
      `*${answer.verificationNote}*`,
    ].join("\n");
  }

  if (!canUseAi) {
    const answer = buildFallbackAnswer(pipeline.triage, pipeline.evidencePack);
    const body = renderFallbackBody(answer);

    await saveMessage({
      threadId: thread.id,
      role: "assistant",
      content: body,
      structured: answer,
      sources: pipeline.evidencePack.sources,
      verification: { status: "interpretation" },
      suggestedActions: answer.suggestedActions,
    });

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          sse("meta", {
            ...metaPayload,
            mode: "offline",
          })
        );
        controller.enqueue(sse("delta", { text: body }));
        controller.enqueue(sse("done", { threadId: thread.id }));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }

  // Live streaming path with SSE
  let full = "";
  const readable = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        sse("meta", {
          ...metaPayload,
          mode: "live",
        })
      );
      try {
        controller.enqueue(
          sse("status", { label: "Reasoning from verified Indian law…", step: 1 })
        );
        const aiStream = streamComplete(system, contextMessages, {
          temperature: 0.25,
          maxTokens: 1400,
          label: "assistant",
        });
        const reader = aiStream.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          full += text;
          controller.enqueue(sse("delta", { text }));
        }

        const verified = verifyClaims(
          [{ text: full, sourceIds: [] }],
          pipeline.evidencePack
        )[0];

        const withSources = attachSourceFooter(full, pipeline.evidencePack);
        const fullDiff = withSources.slice(full.length);
        if (fullDiff) {
          full += fullDiff;
          controller.enqueue(sse("delta", { text: fullDiff }));
        }

        await saveMessage({
          threadId: thread.id,
          role: "assistant",
          content: withSources,
          structured: { understanding: pipeline.triage.summary },
          sources: pipeline.evidencePack.sources,
          verification: verified,
          suggestedActions: pipeline.triage.followUpQuestions.slice(0, 3),
        });
        controller.enqueue(sse("done", { threadId: thread.id, verification: verified }));
        controller.close();
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        logger.error("assistant_stream_error", {
          error: reason,
          streamedChars: full.length,
          tooLarge: err instanceof AiRequestTooLargeError,
        });

        // Bytes already reached the client. Restarting would show the user two
        // different answers to one question, so close out what was delivered.
        if (full.trim().length > 0) {
          const partial = `${full}\n\n*The live explanation was cut short. Please re-ask to get the full answer.*`;
          controller.enqueue(
            sse("delta", {
              text: "\n\n*The live explanation was cut short. Please re-ask to get the full answer.*",
            })
          );
          await safeSave({
            threadId: thread.id,
            role: "assistant",
            content: partial,
            structured: { understanding: pipeline.triage.summary },
            sources: pipeline.evidencePack.sources,
            verification: { status: "interpretation" },
          });
          controller.enqueue(sse("done", { threadId: thread.id }));
          controller.close();
          return;
        }

        // Tier 2 — retry without streaming, on a much smaller prompt. Streaming
        // failures here are dominated by prompt size against the provider's
        // per-minute token budget, so a compact request usually succeeds where
        // the full one cannot, and the user still gets a real AI answer.
        let recovered = "";
        try {
          controller.enqueue(
            sse("status", { label: "Retrying on a compact evidence set…", step: 2 })
          );
          recovered = await complete(
            compactSystem,
            [{ role: "user", content: message }],
            { temperature: 0.25, maxTokens: 1000, label: "assistant_recovery" }
          );
        } catch (retryErr) {
          logger.error("assistant_recovery_failed", {
            error: retryErr instanceof Error ? retryErr.message : String(retryErr),
          });
        }

        if (recovered.trim().length > 0) {
          const withSources = attachSourceFooter(recovered, pipeline.evidencePack);
          controller.enqueue(sse("delta", { text: withSources }));
          await safeSave({
            threadId: thread.id,
            role: "assistant",
            content: withSources,
            structured: { understanding: pipeline.triage.summary },
            sources: pipeline.evidencePack.sources,
            verification: verifyClaims(
              [{ text: recovered, sourceIds: [] }],
              pipeline.evidencePack
            )[0],
            suggestedActions: pipeline.triage.followUpQuestions.slice(0, 3),
          });
          controller.enqueue(sse("done", { threadId: thread.id }));
          controller.close();
          return;
        }

        // Tier 3 — deterministic guidance from retrieved sources only.
        controller.enqueue(
          sse("error", {
            message:
              "Live AI is unavailable right now. Showing guidance from verified sources instead.",
          })
        );
        const answer = buildFallbackAnswer(pipeline.triage, pipeline.evidencePack);
        const fallbackBody = renderFallbackBody(answer);
        controller.enqueue(sse("delta", { text: fallbackBody }));
        await safeSave({
          threadId: thread.id,
          role: "assistant",
          content: fallbackBody,
          structured: answer,
          sources: pipeline.evidencePack.sources,
          verification: { status: "interpretation" },
          suggestedActions: answer.suggestedActions,
        });
        controller.enqueue(sse("done", { threadId: thread.id }));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}
