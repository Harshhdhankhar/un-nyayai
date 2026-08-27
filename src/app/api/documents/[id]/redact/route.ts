import { getCurrentUser } from "@/lib/auth";
import { safeHandler } from "@/lib/security";
import { getOwnedAnalysis, getOwnedDocument } from "@/lib/documents/access";
import { redactText } from "@/lib/documents/pii";

/**
 * POST /api/documents/:id/redact — return a sanitized copy of the document
 * text with all detected PII replaced by typed placeholders. Detection runs
 * live if the analysis hasn't produced PII yet.
 */
async function handler(_req: Request, ctx: unknown) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  const doc = await getOwnedDocument(user.id, id);
  if (!doc || !doc.extractedText) {
    return Response.json({ ok: false, error: "Document not found or unreadable" }, { status: 404 });
  }

  const analysis = await getOwnedAnalysis(id);
  if (analysis?.redactedText) {
    return Response.json({ ok: true, redactedText: analysis.redactedText });
  }
  if (analysis?.result) {
    const result = analysis.result as {
      pii?: { items?: { entity: string; text: string }[] };
    };
    const findings = (result.pii?.items ?? []).map((item, i) => ({
      entityType: item.entity,
      text: item.text,
      confidence: 1,
      // Reconstruct offsets by locating the value in order of appearance.
      start: locate(doc.extractedText!, item.text, i),
      end: 0,
      page: null,
    }));
    for (const f of findings) f.end = f.start + f.text.length;
    return Response.json({
      ok: true,
      redactedText: redactText(
        doc.extractedText,
        findings.filter((f) => f.start >= 0)
      ),
    });
  }

  // No analysis yet — run local detection directly.
  const { detectPii } = await import("@/lib/documents/pii");
  const pii = await detectPii(doc.extractedText, Array.isArray(doc.pageOffsets) ? (doc.pageOffsets as number[]) : []);
  return Response.json({ ok: true, redactedText: redactText(doc.extractedText, pii.findings) });
}

function locate(haystack: string, needle: string, occurrence: number): number {
  let idx = -1;
  for (let i = 0; i <= occurrence; i++) {
    idx = haystack.indexOf(needle, idx + 1);
    if (idx < 0) return -1;
  }
  return idx;
}

export const POST = safeHandler(handler);
