import "server-only";
import { db } from "@/lib/db/client";
import { drafts } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";

export const draftKinds = [
  "legal_notice",
  "consumer_complaint",
  "rti_application",
  "reply_to_notice",
  "basic_complaint",
  "rent_agreement",
  "employment_representation",
  "delay_objection",
] as const;
export type DraftKind = (typeof draftKinds)[number];

export const draftMetaSchema = z.object({
  parties: z
    .array(z.object({ name: z.string(), role: z.string().optional() }))
    .default([]),
  amounts: z.array(z.string()).default([]),
  dates: z.array(z.string()).default([]),
  facts: z.array(z.string()).default([]),
  laws: z.array(z.string()).default([]),
});

export type DraftMeta = z.infer<typeof draftMetaSchema>;

export async function listDrafts(userId: string, matterId?: string) {
  if (matterId) {
    return db
      .select()
      .from(drafts)
      .where(and(eq(drafts.userId, userId), eq(drafts.matterId, matterId)))
      .orderBy(desc(drafts.updatedAt));
  }
  return db
    .select()
    .from(drafts)
    .where(eq(drafts.userId, userId))
    .orderBy(desc(drafts.updatedAt));
}

export async function saveDraft(input: {
  userId: string;
  matterId?: string;
  kind: DraftKind;
  title: string;
  content: string;
  meta?: DraftMeta;
  sources?: unknown;
}) {
  const [row] = await db
    .insert(drafts)
    .values({
      userId: input.userId,
      matterId: input.matterId,
      kind: input.kind as never,
      title: input.title,
      content: input.content,
      facts: (input.meta?.facts ?? []) as never,
      sources: input.sources as never,
    })
    .returning();
  return row;
}

export async function getDraft(userId: string, draftId: string) {
  const rows = await db
    .select()
    .from(drafts)
    .where(and(eq(drafts.id, draftId), eq(drafts.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateDraft(
  userId: string,
  matterId: string,
  draftId: string,
  patch: Partial<{ title: string; content: string; status: "draft" | "review" | "final" }>
) {
  const [row] = await db
    .update(drafts)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(drafts.id, draftId), eq(drafts.userId, userId), eq(drafts.matterId, matterId)))
    .returning();
  return row ?? null;
}

export async function deleteDraft(userId: string, draftId: string) {
  await db
    .delete(drafts)
    .where(and(eq(drafts.id, draftId), eq(drafts.userId, userId)));
}
