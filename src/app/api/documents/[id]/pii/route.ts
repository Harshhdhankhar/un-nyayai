import { getCurrentUser } from "@/lib/auth";
import { safeHandler } from "@/lib/security";
import { getOwnedAnalysis, getOwnedDocument } from "@/lib/documents/access";

/**
 * GET /api/documents/:id/pii — PII findings from the latest analysis.
 * Supports ?privacy=redacted to fetch the sanitized text instead.
 */
async function handler(req: Request, ctx: unknown) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const doc = await getOwnedDocument(user.id, id);
  if (!doc) return Response.json({ ok: false, error: "Document not found" }, { status: 404 });

  const analysis = await getOwnedAnalysis(id);
  if (!analysis || analysis.status !== "done") {
    return Response.json({ ok: true, ready: false, pii: null });
  }

  const url = new URL(req.url);
  if (url.searchParams.get("privacy") === "redacted") {
    return Response.json({
      ok: true,
      ready: true,
      privacyMode: "redacted",
      redactedText: analysis.redactedText ?? doc.extractedText,
    });
  }

  const result = analysis.result as {
    pii?: { engine?: string; count?: number; items?: unknown[] };
  } | null;
  return Response.json({
    ok: true,
    ready: true,
    engine: result?.pii?.engine ?? "regex",
    count: result?.pii?.count ?? 0,
    items: result?.pii?.items ?? [],
  });
}

export const GET = safeHandler(handler);
