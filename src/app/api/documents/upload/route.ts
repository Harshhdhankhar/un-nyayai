import { getCurrentUser } from "@/lib/auth";
import { safeHandler, validateUpload, sanitizeText } from "@/lib/security";
import { createDocumentRecord, extractDocument } from "@/lib/documents/service";
import { ocrImage, isProbablyScanned } from "@/lib/documents/ocr";


/**
 * POST /api/documents/upload — standalone document upload for the analyzer.
 */
async function handler(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ ok: false, error: "Invalid form data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ ok: false, error: "No file provided." }, { status: 400 });
  }

  const check = validateUpload({ type: file.type, size: file.size, name: file.name });
  if (!check.ok) {
    return Response.json({ ok: false, error: check.error }, { status: 400 });
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    let extracted = await extractDocument(file.type, file.name, buf);
    let needsOcr = false;

    // Scanned PDFs / images -> attempt OCR
    if (!extracted && file.type.startsWith("image/")) {
      const text = await ocrImage(buf, file.type);
      if (text) {
        extracted = { text, pageOffsets: [0] };
      } else {
        needsOcr = true;
      }
    } else if (extracted && isProbablyScanned(extracted.text)) {
      needsOcr = true;
    }

    if (!extracted && !needsOcr) {
      // Create record with minimal fallback text so user can still review and chat with it
      extracted = { text: `Document: ${file.name} (Uploaded ${new Date().toLocaleDateString()})`, pageOffsets: [0] };
    }

    const record = await createDocumentRecord({
      userId: user.id,
      name: sanitizeText(file.name).slice(0, 240) || file.name,
      mimeType: file.type || "application/pdf",
      sizeBytes: file.size,
      extractedText: extracted?.text ?? null,
      pageOffsets: extracted?.pageOffsets ?? [0],
    });

    return Response.json(
      {
        ok: true,
        document: {
          id: record.id,
          name: record.name,
          status: record.status,
          needsOcr,
          pages: extracted?.pageOffsets?.length ?? 1,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string }).code;
    const detail = (err as { detail?: string }).detail;
    console.error("[analyzer_upload_failed]", {
      name: file.name,
      type: file.type,
      size: file.size,
      message: msg,
      code,
      detail,
      stack: err instanceof Error ? err.stack : undefined,
    });
    return Response.json(
      {
        ok: false,
        error: `Could not process this document${code ? ` [${code}]` : ""}: ${msg}${detail ? ` — ${detail}` : ""}. Please verify the file is not password-protected and try again.`,
      },
      { status: 500 }
    );
  }
}

export const POST = safeHandler(handler);
