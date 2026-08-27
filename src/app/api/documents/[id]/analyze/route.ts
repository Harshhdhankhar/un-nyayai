import { after } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { safeHandler } from "@/lib/security";
import { getOwnedDocument } from "@/lib/documents/access";
import { runAnalysis } from "@/lib/documents/analyzer";
import { logger } from "@/lib/logger";

/**
 * POST /api/documents/:id/analyze — kick off the full analysis pipeline.
 * Responds immediately; processing continues via `after()` and progress is
 * pollable at GET /api/documents/:id/analysis.
 */
async function handler(_req: Request, ctx: unknown) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const doc = await getOwnedDocument(user.id, id);
  if (!doc) return Response.json({ ok: false, error: "Document not found" }, { status: 404 });
  if (!doc.extractedText?.trim()) {
    return Response.json(
      { ok: false, error: "This document has no readable text to analyze." },
      { status: 422 }
    );
  }

  // Validate the pipeline starts cleanly before returning.
  try {
    after(async () => {
      try {
        await runAnalysis(id);
      } catch (err) {
        logger.error("background_analysis_failed", {
          documentId: id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });
  } catch {
    return Response.json({ ok: false, error: "Could not start analysis." }, { status: 500 });
  }

  return Response.json({ ok: true, status: "queued" }, { status: 202 });
}

export const POST = safeHandler(handler);
