import { getCurrentUser } from "@/lib/auth";
import { safeHandler } from "@/lib/security";
import { getOwnedAnalysis, getOwnedDocument } from "@/lib/documents/access";

/** GET /api/documents/:id/risks — legal risk findings with severity. */
async function handler(_req: Request, ctx: unknown) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const doc = await getOwnedDocument(user.id, id);
  if (!doc) return Response.json({ ok: false, error: "Document not found" }, { status: 404 });

  const analysis = await getOwnedAnalysis(id);
  const result = analysis?.result as {
    risks?: unknown[];
    missingInformation?: unknown[];
  } | null;
  if (!analysis || analysis.status !== "done" || !result) {
    return Response.json({ ok: true, ready: false, risks: [], missingInformation: [] });
  }

  return Response.json({
    ok: true,
    ready: true,
    risks: result.risks ?? [],
    missingInformation: result.missingInformation ?? [],
  });
}

export const GET = safeHandler(handler);
