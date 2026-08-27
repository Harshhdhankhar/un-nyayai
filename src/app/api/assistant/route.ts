import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { z } from "zod";
import { runPipeline, buildFallbackAnswer, buildAssistantSystem, isChattyMessage } from "@/lib/ai/orchestrator";
import { CHAT_SYSTEM, languageInstruction, modeInstruction, UNTRUSTED_DATA_RULE, evidencePackBlock } from "@/lib/ai/prompts";
import { streamComplete } from "@/lib/ai/groq";
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

  const contextMessages = priorTurns.slice(-10).map((m) => ({
    role: m.role,
    content: m.content.length > 1800 ? `${m.content.slice(0, 1800)}…` : m.content,
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

  const system = `${buildAssistantSystem(language, mode)}${contextInstruction}\n\n${UNTRUSTED_DATA_RULE}\n\n${evidencePackBlock(
    "EVIDENCE PACK",
    pipeline.evidencePack.sources
      .map(
        (s, i) =>
          `[${i + 1}] ${s.title} (${s.type})${s.authority ? `, ${s.authority}` : ""}${s.date ? `, ${s.date}` : ""}\n${s.excerpt ?? ""}`
      )
      .join("\n\n") || "No verified sources retrieved."
  )}`;

  const metaPayload = {
    triage: pipeline.triage,
    sources: pipeline.evidencePack.sources,
    providerStatus: pipeline.providerStatus,
    route: pipeline.route,
    threadId: thread.id,
    contextBadge: context?.pageType,
  };

  if (!canUseAi) {
    const answer = buildFallbackAnswer(pipeline.triage, pipeline.evidencePack);
    const body = [
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
          maxTokens: 1800,
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
        logger.error("assistant_stream_error", {
          error: err instanceof Error ? err.message : String(err),
        });
        controller.enqueue(
          sse("error", {
            message: "Live AI stream failed. Showing deterministic legal guidance.",
          })
        );
        const answer = buildFallbackAnswer(pipeline.triage, pipeline.evidencePack);
        const fallbackBody = `### Short Answer\n${answer.understanding}\n\n### What You Can Do\n1. ${answer.nextAction}\n\n*${answer.verificationNote}*`;
        controller.enqueue(sse("delta", { text: fallbackBody }));
        await saveMessage({
          threadId: thread.id,
          role: "assistant",
          content: fallbackBody,
          structured: answer,
          sources: pipeline.evidencePack.sources,
          verification: { status: "interpretation" },
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
