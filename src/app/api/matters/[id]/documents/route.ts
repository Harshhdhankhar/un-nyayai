import { getCurrentUser } from "@/lib/auth";
import { safeHandler, validateUpload, sanitizeText } from "@/lib/security";
import { createDocumentRecord, extractText, analyzeDocument } from "@/lib/documents/service";
import { getMatter } from "@/lib/matters/service";
import { db } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";

async function handler(req: Request, ctx: unknown) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
  const matter = await getMatter(id);
  if (!matter || matter.userId !== user.id) {
    return Response.json({ ok: false, error: "Matter not found" }, { status: 404 });
  }

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return Response.json({ ok: false, error: "No files provided." }, { status: 400 });
  }

  const results: { name: string; status: string; summary?: string }[] = [];
  const errors: { name: string; error: string }[] = [];

  for (const file of files) {
    const check = validateUpload({ type: file.type, size: file.size });
    if (!check.ok) {
      errors.push({ name: file.name, error: check.error });
      continue;
    }
    try {
      const buf = Buffer.from(await file.arrayBuffer());
      const text = await extractText(file.type, file.name, buf);
      const record = await createDocumentRecord({
        userId: user.id,
        matterId: id,
        name: sanitizeText(file.name).slice(0, 240) || file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        extractedText: text,
      });
      let summary: string | undefined;
      if (text) {
        const analysis = await analyzeDocument(record.id, text);
        summary = analysis.summary;
      }
      results.push({ name: file.name, status: "processed", summary });
    } catch (err) {
      logger.error("document_upload_failed", {
        name: file.name,
        error: err instanceof Error ? err.message : String(err),
      });
      errors.push({ name: file.name, error: "Processing failed." });
    }
  }

  return Response.json({ ok: true, results, errors }, { status: 201 });
}

export const POST = safeHandler(handler);
