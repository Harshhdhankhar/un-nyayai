import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";
import { safeHandler } from "@/lib/security";
import { getOwnedDocument } from "@/lib/documents/access";
import {
  getDocumentChatHistory,
  saveDocumentChatMessage,
  streamDocumentAnswer,
} from "@/lib/documents/chat";
import { rateLimit, rateLimitKey, clientIp } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";

const DOC_CHAT_LIMIT = 20;
const DOC_CHAT_WINDOW_MS = 60_000;

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
});

const encoder = new TextEncoder();

function sse(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/**
 * GET /api/documents/:id/chat — chat history for this document.
 */
export async function GET(req: Request, ctx: unknown) {
  return safeHandler(async () => {
    const user = await getCurrentUser();
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

    const doc = await getOwnedDocument(user.id, id);
    if (!doc) return Response.json({ ok: false, error: "Document not found" }, { status: 404 });

    const history = await getDocumentChatHistory(id);
    return Response.json({
      ok: true,
      messages: history.map((m) => ({
        role: m.role,
        content: m.content,
        citations: m.citations ?? undefined,
        createdAt: m.createdAt,
      })),
    });
  })(req, ctx);
}

/**
 * POST /api/documents/:id/chat — ask a question grounded in this document.
 * Streams SSE deltas; persists both turns with citations.
 */
async function postHandler(req: Request, ctx: unknown) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const doc = await getOwnedDocument(user.id, id);
  if (!doc) return Response.json({ ok: false, error: "Document not found" }, { status: 404 });
  if (!doc.extractedText?.trim()) {
    return Response.json(
      { ok: false, error: "This document has no readable text to chat about." },
      { status: 422 }
    );
  }

  const limited = rateLimit(rateLimitKey(clientIp(req), user.id, "doc-chat"), DOC_CHAT_LIMIT, DOC_CHAT_WINDOW_MS);
  if (!limited.ok) {
    return Response.json({ ok: false, error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Message is required." }, { status: 400 });
  }
  const question = parsed.data.message;

  await saveDocumentChatMessage({ documentId: id, role: "user", content: question });

  const stream = new ReadableStream({
    async start(controller) {
      let full = "";
      try {
        const textStream = streamDocumentAnswer({
          userId: user.id,
          documentId: id,
          documentName: doc.name,
          question,
        });
        const reader = textStream.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          full += text;
          controller.enqueue(sse("delta", { text }));
        }

        // Extract "Source: Page N" citations from the answer for the UI.
        const citations = [...full.matchAll(/\*\*Source:\s*(?:Page\s+(\d+)\s*[—–-]\s*)?([^*\n]+)\*\*/g)]
          .slice(0, 10)
          .map((m) => ({ page: m[1] ? Number(m[1]) : null, label: m[2].trim() }));

        await saveDocumentChatMessage({
          documentId: id,
          role: "assistant",
          content: full,
          citations,
        });
        controller.enqueue(sse("done", { citations }));
        controller.close();
      } catch (err) {
        logger.error("document_chat_error", {
          documentId: id,
          error: err instanceof Error ? err.message : String(err),
        });
        const fallback =
          full ||
          "I couldn't process that question right now. Please try again in a moment.";
        if (!full) controller.enqueue(sse("delta", { text: fallback }));
        await saveDocumentChatMessage({ documentId: id, role: "assistant", content: fallback });
        controller.enqueue(sse("done", {}));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}

export const POST = safeHandler(postHandler);
