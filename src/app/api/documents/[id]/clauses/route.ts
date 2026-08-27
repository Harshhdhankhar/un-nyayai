import { getCurrentUser } from "@/lib/auth";
import { safeHandler } from "@/lib/security";
import { getOwnedAnalysis, getOwnedDocument } from "@/lib/documents/access";

/** GET /api/documents/:id/clauses — extracted clauses with risk levels. */
async function handler(_req: Request, ctx: unknown) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const doc = await getOwnedDocument(user.id, id);
  if (!doc) return Response.json({ ok: false, error: "Document not found" }, { status: 404 });

  const analysis = await getOwnedAnalysis(id);
  const result = analysis?.result as { clauses?: unknown[]; documentType?: { name?: string } } | null;
  if (!analysis || analysis.status !== "done" || !result) {
    return Response.json({ ok: true, ready: false, clauses: [] });
  }

  return Response.json({
    ok: true,
    ready: true,
    documentType: result.documentType?.name ?? "Other / Unknown",
    clauses: result.clauses ?? [],
  });
}

export const GET = safeHandler(handler);
