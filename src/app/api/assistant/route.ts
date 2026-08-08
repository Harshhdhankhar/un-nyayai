import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { z } from "zod";
import { runPipeline, buildFallbackAnswer, buildAssistantSystem, isChattyMessage } from "@/lib/ai/orchestrator";
import { CHAT_SYSTEM, languageInstruction, modeInstruction } from "@/lib/ai/prompts";
import { streamComplete } from "@/lib/ai/groq";
import { canUseAi } from "@/lib/config";
import { getOrCreateThread, saveMessage, getThreadMessages } from "@/lib/matters/chat";
import { attachSourceFooter, verifyClaims } from "@/lib/ai/verification";
import { logger } from "@/lib/logger";

const assistantSchema = z.object({
  message: z.string().min(1).max(4000),
  threadId: z.string().uuid().optional(),
  matterId: z.string().uuid().optional(),
  mode: z.enum(["simple", "detailed", "professional"]).default("simple"),
  language: z.enum(["en", "hi", "hinglish"]).default("en"),
  research: z.boolean().default(false),
});

const encoder = new TextEncoder();

function sse(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: NextRequest) {
  const user = await requireApiUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const parsed = assistantSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data." },
      { status: 400 }
    );
  }

  const { message, mode, language, research } = parsed.data;
  const isChat = isChattyMessage(message);

  const thread = await getOrCreateThread({
    userId: user.id,
    threadId: parsed.data.threadId,
    matterId: parsed.data.matterId,
    title: isChat ? "New conversation" : message.slice(0, 60),
    mode,
    language,
  });

  await saveMessage({ threadId: thread.id, role: "user", content: message });

  // Conversation memory — load prior turns so the LLM has full context.
  const history = await getThreadMessages(thread.id);
  const priorTurns = history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  // Build a compact, recent context window (last ~12 messages).
  const contextMessages = priorTurns.slice(-12);

  // Greetings / small talk: answer warmly without the legal pipeline.
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
          const reply = `**Hi there!** 👋 I'm NyayAI, your legal navigation assistant. I'm not a lawyer, but I can help you understand your situation and your options. What's going on?`;
          await saveMessage({ threadId: thread.id, role: "assistant", content: reply, structured: { chat: true } });
          controller.enqueue(sse("delta", { text: reply }));
          controller.enqueue(sse("done", { threadId: thread.id }));
          controller.close();
          return;
        }
        try {
          const aiStream = streamComplete(chatSystem, contextMessages, {
            temperature: 0.8,
            maxTokens: 200,
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
          const reply = `**Hi there!** 👋 I'm NyayAI, your legal navigation assistant. I can help you understand your situation and your options — just tell me what happened.`;
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

  // Pipeline: triage + retrieval + evidence pack.
  const pipeline = await runPipeline({
    statement: message,
    language,
    mode,
    research,
    useKanoon: research,
    userId: user.id,
    matterId: parsed.data.matterId,
  });

  const system = `${buildAssistantSystem(language, mode)}\n\nEvidence pack:\n${pipeline.evidencePack.sources
    .map(
      (s, i) =>
        `[${i + 1}] ${s.title} (${s.type})${s.authority ? `, ${s.authority}` : ""}${s.date ? `, ${s.date}` : ""}\n${s.excerpt ?? ""}`
    )
    .join("\n\n") || "No verified sources retrieved."}`;

  const metaPayload = {
    triage: pipeline.triage,
    sources: pipeline.evidencePack.sources,
    providerStatus: pipeline.providerStatus,
    route: pipeline.route,
    threadId: thread.id,
  };

  if (!canUseAi) {
    // Deterministic fallback — structured, sourced, no AI synthesis.
    const answer = buildFallbackAnswer(pipeline.triage, pipeline.evidencePack, language);
    const body = [
      `**${answer.understanding}**`,
      "",
      ...(answer.possiblePathways.length > 0
        ? ["**A few possible paths:**", ...answer.possiblePathways.map((p) => `- ${p}`), ""]
        : []),
      ...(answer.missingInformation.length > 0
        ? [`**To help more, it'd be useful to know:**`, ...answer.missingInformation.map((m) => `- ${m}`), ""]
        : []),
      ...(answer.relevantLaw.length > 0
        ? ["**Relevant law:**", ...answer.relevantLaw.map((r) => `- ${r}`), ""]
        : []),
      `**A small next step:** ${answer.nextAction}`,
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

  // Live streaming path.
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
          sse("status", { label: "Understanding your situation…", step: 1 })
        );
        const aiStream = streamComplete(system, contextMessages, {
          temperature: 0.3,
          maxTokens: 1600,
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
        // Append sources footer deterministically.
        const withSources = attachSourceFooter(full, pipeline.evidencePack);
        const fullDiff = withSources.slice(full.length);
        if (fullDiff) {
          full += fullDiff;
          controller.enqueue(sse("delta", { text: fullDiff }));
        }
        const verified = verifyClaims(
          [{ text: full, sourceIds: [] }],
          pipeline.evidencePack
        )[0];
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
            message: "Live AI is unavailable right now. Showing offline guidance instead.",
          })
        );
        const answer = buildFallbackAnswer(pipeline.triage, pipeline.evidencePack, language);
        const fallbackBody = `**${answer.understanding}**\n\n**Next step:** ${answer.nextAction}\n\n*${answer.verificationNote}*`;
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
