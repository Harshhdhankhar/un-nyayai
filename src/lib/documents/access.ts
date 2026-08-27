import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documentAnalyses, documents } from "@/lib/db/schema";

/**
 * Ownership-checked accessors. Every document API goes through these so one
 * user can never read or mutate another user's documents by ID guessing.
 */
export async function getOwnedDocument(userId: string, documentId: string) {
  const [row] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function getOwnedAnalysis(documentId: string) {
  const [row] = await db
    .select()
    .from(documentAnalyses)
    .where(eq(documentAnalyses.documentId, documentId))
    .limit(1);
  return row ?? null;
}
