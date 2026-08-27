import { getCurrentUser } from "@/lib/auth";
import { safeHandler } from "@/lib/security";
import { getOwnedDocument } from "@/lib/documents/access";

/**
 * GET /api/documents/:id/text — extracted text split into pages using the
 * page offsets recorded at upload time. Powers the page-anchored viewer.
 */
async function handler(_req: Request, ctx: unknown) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const doc = await getOwnedDocument(user.id, id);
  if (!doc) return Response.json({ ok: false, error: "Document not found" }, { status: 404 });

  const text = doc.extractedText ?? "";
  if (!text) return Response.json({ ok: true, pages: [], text: "" });

  const offsets = Array.isArray(doc.pageOffsets) ? (doc.pageOffsets as number[]) : [];
  if (offsets.length <= 1) {
    return Response.json({ ok: true, pages: [{ page: 1, text }], text });
  }

  const pages = offsets.map((start, i) => {
    const end = i + 1 < offsets.length ? offsets[i + 1] : text.length;
    return { page: i + 1, text: text.slice(start, end).trim() };
  });
  return Response.json({ ok: true, pages, text });
}

export const GET = safeHandler(handler);
