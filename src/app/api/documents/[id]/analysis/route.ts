import { getCurrentUser } from "@/lib/auth";
import { safeHandler } from "@/lib/security";
import { getOwnedAnalysis, getOwnedDocument } from "@/lib/documents/access";

/** GET /api/documents/:id/analysis — processing status + structured report. */
async function handler(_req: Request, ctx: unknown) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const doc = await getOwnedDocument(user.id, id);
  if (!doc) return Response.json({ ok: false, error: "Document not found" }, { status: 404 });

  const analysis = await getOwnedAnalysis(id);
  if (!analysis) {
    return Response.json({ ok: true, status: "none", result: null });
  }

  return Response.json({
    ok: true,
    status: analysis.status,
    stage: analysis.stage,
    progress: analysis.progress,
    error: analysis.error,
    pageCount: analysis.pageCount,
    privacyMode: analysis.privacyMode,
    result: analysis.result,
    updatedAt: analysis.updatedAt,
  });
}

export const GET = safeHandler(handler);
