import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { safeHandler } from "@/lib/security";
import { getOwnedDocument } from "@/lib/documents/access";

/** GET /api/documents/:id — owned document metadata. */
async function getHandler(_req: Request, ctx: unknown) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const doc = await getOwnedDocument(user.id, id);
  if (!doc) return Response.json({ ok: false, error: "Document not found" }, { status: 404 });

  return Response.json({
    ok: true,
    document: {
      id: doc.id,
      name: doc.name,
      kind: doc.kind,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      status: doc.status,
      summary: doc.summary,
      pageCount: Array.isArray(doc.pageOffsets) ? doc.pageOffsets.length : null,
      createdAt: doc.createdAt,
    },
  });
}

/** DELETE /api/documents/:id — securely delete an owned document. */
async function deleteHandler(_req: Request, ctx: unknown) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const deleted = await db
    .delete(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, user.id)))
    .returning({ id: documents.id });

  if (deleted.length === 0) {
    return Response.json({ ok: false, error: "Document not found" }, { status: 404 });
  }
  // Chunks, entities, analyses and chat rows cascade via FK.
  return Response.json({ ok: true, id });
}

export const GET = safeHandler(getHandler);
export const DELETE = safeHandler(deleteHandler);
