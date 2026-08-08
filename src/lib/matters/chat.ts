import "server-only";
import { eq, asc, desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { chatThreads, chatMessages } from "@/lib/db/schema";

export async function getOrCreateThread(input: {
  userId: string;
  threadId?: string;
  matterId?: string;
  title?: string;
  mode?: "simple" | "detailed" | "professional";
  language?: "en" | "hi" | "hinglish";
}) {
  if (input.threadId) {
    const existing = await db
      .select()
      .from(chatThreads)
      .where(eq(chatThreads.id, input.threadId))
      .limit(1);
    if (existing.length > 0 && existing[0].userId === input.userId) {
      return existing[0];
    }
  }
  const [thread] = await db
    .insert(chatThreads)
    .values({
      userId: input.userId,
      matterId: input.matterId,
      title: input.title ?? "New conversation",
      mode: input.mode ?? "simple",
      language: input.language ?? "en",
    })
    .returning();
  return thread;
}

export async function saveMessage(input: {
  threadId: string;
  role: "user" | "assistant" | "system";
  content: string;
  structured?: unknown;
  sources?: unknown;
  verification?: unknown;
  suggestedActions?: unknown;
}) {
  const [message] = await db
    .insert(chatMessages)
    .values({
      threadId: input.threadId,
      role: input.role,
      content: input.content,
      structured: input.structured ?? null,
      sources: input.sources ?? null,
      verification: input.verification ?? null,
      suggestedActions: input.suggestedActions ?? null,
    })
    .returning();
  await db
    .update(chatThreads)
    .set({ updatedAt: new Date() })
    .where(eq(chatThreads.id, input.threadId));
  return message;
}

export async function getThreadMessages(threadId: string) {
  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.threadId, threadId))
    .orderBy(asc(chatMessages.createdAt));
}

export async function listThreads(userId: string) {
  return db
    .select({
      id: chatThreads.id,
      title: chatThreads.title,
      matterId: chatThreads.matterId,
      mode: chatThreads.mode,
      language: chatThreads.language,
      createdAt: chatThreads.createdAt,
      updatedAt: chatThreads.updatedAt,
    })
    .from(chatThreads)
    .where(eq(chatThreads.userId, userId))
    .orderBy(desc(chatThreads.updatedAt));
}

export async function getThread(userId: string, threadId: string) {
  const [thread] = await db
    .select()
    .from(chatThreads)
    .where(eq(chatThreads.id, threadId))
    .limit(1);
  if (!thread || thread.userId !== userId) return null;
  return thread;
}

export async function deleteThread(userId: string, threadId: string) {
  const thread = await getThread(userId, threadId);
  if (!thread) return false;
  await db.delete(chatThreads).where(eq(chatThreads.id, threadId));
  return true;
}

export async function renameThread(userId: string, threadId: string, title: string) {
  const thread = await getThread(userId, threadId);
  if (!thread) return false;
  await db
    .update(chatThreads)
    .set({ title: title.slice(0, 100) })
    .where(eq(chatThreads.id, threadId));
  return true;
}
