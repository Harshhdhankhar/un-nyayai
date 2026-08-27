import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documentChatMessages } from "@/lib/db/schema";
import { retrieveDocumentChunks } from "@/lib/retrieval/documents";
import { canUseAi } from "@/lib/config";
import { streamComplete, type ChatMessage } from "@/lib/ai/groq";

/**
 * "Ask NyayAI" — chat grounded strictly in ONE uploaded document.
 *
 * Retrieval pulls the most relevant chunks of that document (hybrid pgvector
 * + FTS), and the system prompt forbids answering beyond them. If the
 * answer is not in the document, the model must say so explicitly.
 */

const DOC_CHAT_SYSTEM = `You are NyayAI, a legal document assistant. You are answering questions about ONE specific document uploaded by the user.

STRICT GROUNDING RULES:
1. Answer ONLY using the provided DOCUMENT EXTRACTS. Never use outside legal knowledge for facts about this document.
2. Every factual claim must cite its source in the format: **Source: Page N — <section title>**. When page is unknown cite **Source: Document text**.
3. If the extracts do not contain the answer, respond exactly: "I couldn't find this information in the uploaded document." Optionally suggest what the user could check instead.
4. Never fabricate clauses, dates, amounts or parties.
5. You may explain what a quoted clause means in plain language, clearly separating explanation from what the text says.
6. NyayAI provides informational assistance and document analysis. It does not replace professional legal advice.`;

export interface DocCitation {
  label: string;
  page: number | null;
}

export async function getDocumentChatHistory(documentId: string) {
  return db
    .select()
    .from(documentChatMessages)
    .where(eq(documentChatMessages.documentId, documentId))
    .orderBy(asc(documentChatMessages.createdAt))
    .limit(200);
}

export async function saveDocumentChatMessage(input: {
  documentId: string;
  role: "user" | "assistant";
  content: string;
  citations?: DocCitation[];
}) {
  await db.insert(documentChatMessages).values({
    documentId: input.documentId,
    role: input.role,
    content: input.content,
    citations: input.citations ?? null,
  });
}

/** Retrieve the most relevant chunks of this document for the question. */
async function buildContext(
  userId: string,
  documentId: string,
  question: string,
  history: { role: string; content: string }[]
): Promise<string> {
  // Use recent turns to make the retrieval query self-contained.
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const query = lastUser && lastUser.content !== question ? `${lastUser.content}\n${question}` : question;
  const hits = await retrieveDocumentChunks(query, { userId, documentId, k: 6 });
  if (hits.length === 0) return "";
  return hits
    .map(
      (h) =>
        `[EXTRACT] ${h.documentName}${h.page ? `, Page ${h.page}` : ""}:\n${h.content.slice(0, 1200)}`
    )
    .join("\n\n---\n\n");
}

/**
 * Build the streaming response for a document-chat turn.
 * Returns a ReadableStream of plain text deltas (SSE framing done by route).
 */
export function streamDocumentAnswer(input: {
  userId: string;
  documentId: string;
  documentName: string;
  question: string;
}): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (!canUseAi) {
          controller.enqueue(
            encoder.encode(
              "Live AI is unavailable right now, so I can only point you to the document viewer. Please try again later."
            )
          );
          controller.close();
          return;
        }
        const history = await getDocumentChatHistory(input.documentId);
        const priorTurns = history
          .filter((m) => m.role === "user" || m.role === "assistant")
          .slice(-8)
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

        const context = await buildContext(
          input.userId,
          input.documentId,
          input.question,
          priorTurns.slice(0, -1)
        );

        const messages: ChatMessage[] = [
          ...priorTurns.map((t) => ({
            role: t.role as "user" | "assistant",
            content: t.content.slice(0, 1500),
          })),
          {
            role: "user",
            content: context
              ? `DOCUMENT: ${input.documentName}\n\nDOCUMENT EXTRACTS:\n${context}\n\nQUESTION: ${input.question}`
              : `DOCUMENT: ${input.documentName}\n\n(The document has no searchable text extracts.)\n\nQUESTION: ${input.question}`,
          },
        ];

        const aiStream = streamComplete(DOC_CHAT_SYSTEM, messages, {
          temperature: 0.2,
          maxTokens: 900,
        });
        const reader = aiStream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}
