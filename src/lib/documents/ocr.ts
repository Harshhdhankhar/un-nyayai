import "server-only";
import { config, hasLegalNlp } from "@/lib/config";
import { logger } from "@/lib/logger";

/**
 * OCR support for image-based documents.
 *
 * Uses the optional pytesseract endpoint on the legal-nlp microservice when
 * configured. Scanned PDFs cannot be rasterized server-side without native
 * canvas dependencies, so they are flagged as needing OCR instead — callers
 * surface that state to the user rather than failing silently.
 */
export async function ocrImage(
  buf: Buffer,
  mime: string
): Promise<string | null> {
  if (!hasLegalNlp) return null;
  if (!["image/png", "image/jpeg", "image/webp"].includes(mime)) return null;
  try {
    const res = await fetch(`${config.legalNlpUrl}/ocr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images: [buf.toString("base64")], language: "eng" }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { available?: boolean; pages?: string[] };
    if (!data.available || !data.pages?.length) return null;
    return data.pages[0].trim() || null;
  } catch (err) {
    logger.warn("ocr_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/** Heuristic: a PDF whose extracted text is this short is likely scanned. */
export function isProbablyScanned(text: string | null): boolean {
  return !text || text.replace(/\s/g, "").length < 50;
}
