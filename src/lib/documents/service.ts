import "server-only";
import { db } from "@/lib/db/client";
import { documents, documentChunks, documentEntities } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { embed } from "@/lib/embedding";
import { analyzeWithNlpService } from "@/lib/nlp/client";

/** Extract plain text from an uploaded buffer. Returns null if unsupported. */
export async function extractText(
  mimeType: string,
  fileName: string,
  buf: Buffer
): Promise<string | null> {
  const doc = await extractDocument(mimeType, fileName, buf);
  return doc?.text ?? null;
}

export interface ExtractedDocument {
  text: string;
  /** Character offset where each page starts (index i = page i+1). */
  pageOffsets: number[];
}

/**
 * Strip characters a PostgreSQL text/jsonb column cannot store. Postgres text
 * cannot contain the NUL byte (U+0000) — attempting to insert one aborts the
 * whole query (this was the real cause of the /api/documents/upload 500, when a
 * scanned/compressed PDF fell back to raw-stream scraping and produced binary).
 * We also drop the other C0 control characters (keeping tab/newline/carriage
 * return) and the Unicode replacement char that binary scraping emits as noise.
 */
export function sanitizeText(input: string): string {
  return (
    input
      // NUL byte — PostgreSQL text/jsonb columns cannot store it.
      // eslint-disable-next-line no-control-regex
      .replace(/\u0000/g, "")
      // Other C0 control chars, but keep \t (\u0009), \n (\u000A), \r (\u000D).
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      // Unicode replacement char that binary-stream scraping emits as noise.
      .replace(/\uFFFD/g, "")
  );
}

/** Extract text plus per-page offsets so chunks can carry page provenance. */
export async function extractDocument(
  mimeType: string,
  fileName: string,
  buf: Buffer
): Promise<ExtractedDocument | null> {
  const isPdf = mimeType === "application/pdf" || /\.pdf$/i.test(fileName);
  const isDocx =
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword" ||
    /\.docx?$/i.test(fileName);
  const isTxt = mimeType === "text/plain" || /\.txt$/i.test(fileName);

  if (isTxt) {
    const text = sanitizeText(buf.toString("utf-8")).slice(0, 400_000);
    return { text, pageOffsets: [0] };
  }

  if (isPdf) {
    return extractPdfText(buf);
  }

  if (isDocx) {
    return extractDocxText(buf);
  }

  return null;
}

async function extractDocxText(buf: Buffer): Promise<ExtractedDocument | null> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: buf });
    const text = sanitizeText(result.value ?? "").slice(0, 400_000).trim();
    if (!text) return null;
    return { text, pageOffsets: [0] };
  } catch {
    return null;
  }
}

/**
 * pdfjs-dist v6's legacy build evaluates `const SCALE_MATRIX = new DOMMatrix()`
 * at module-import time. In a headless Node runtime `DOMMatrix` only exists if
 * the native `@napi-rs/canvas` addon loads — which it does not on Linux/Vercel
 * (or any host without a matching prebuilt binary). When the import throws, we
 * lose real PDF text extraction and fall back to a regex scraper that returns
 * nothing for compressed PDFs. Text extraction (`getTextContent`) never touches
 * these canvas classes, so lightweight globals let pdfjs import cleanly without
 * depending on a platform-specific native module.
 */
function ensurePdfGlobals(): void {
  const g = globalThis as Record<string, unknown>;
  if (typeof g.DOMMatrix === "undefined") {
    class DOMMatrixPolyfill {
      a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
      constructor(init?: number[] | string) {
        if (Array.isArray(init) && init.length === 6) {
          [this.a, this.b, this.c, this.d, this.e, this.f] = init;
        }
      }
      multiplySelf() { return this; }
      preMultiplySelf() { return this; }
      translateSelf() { return this; }
      scaleSelf() { return this; }
      static fromMatrix(o?: { a: number; b: number; c: number; d: number; e: number; f: number }) {
        return new DOMMatrixPolyfill(o ? [o.a, o.b, o.c, o.d, o.e, o.f] : undefined);
      }
    }
    g.DOMMatrix = DOMMatrixPolyfill;
  }
  if (typeof g.Path2D === "undefined") {
    g.Path2D = class Path2D {};
  }
  if (typeof g.ImageData === "undefined") {
    g.ImageData = class ImageData {
      constructor(public width = 0, public height = 0) {}
    };
  }
}

async function extractPdfText(buf: Buffer): Promise<ExtractedDocument> {
  try {
    ensurePdfGlobals();
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buf),
      useSystemFonts: true,
      disableFontFace: true,
      verbosity: 0,
    });
    const pdf = await loadingTask.promise;
    const pages: string[] = [];
    let text = "";
    const pageOffsets: number[] = [];

    for (let i = 1; i <= Math.min(pdf.numPages, 100); i++) {
      try {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = sanitizeText(
          content.items
            .map((item: unknown) => ((item as { str?: string }).str ?? ""))
            .join(" ")
        ).trim();

        if (text.length < 400_000) {
          pageOffsets.push(text.length);
          pages.push(pageText);
          text += (i > 1 ? "\n\n" : "") + pageText;
        }
      } catch (pageErr) {
        logger.warn("pdf_page_extract_warn", { page: i, error: String(pageErr) });
      }
    }

    const trimmed = text.trim();
    if (trimmed.length > 20) {
      return { text: trimmed.slice(0, 400_000), pageOffsets: pageOffsets.length > 0 ? pageOffsets : [0] };
    }
  } catch (err) {
    logger.warn("pdfjs_dist_failed_attempting_stream_fallback", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Fallback: extract plain text streams directly from PDF binary buffer.
  const fallbackText = sanitizeText(extractTextStreamsFromPdfBuffer(buf));
  return {
    text: fallbackText.slice(0, 400_000),
    pageOffsets: [0],
  };
}

/**
 * Fallback extractor that recovers text blocks from raw PDF streams.
 *
 * This only works for PDFs whose content streams are uncompressed. For
 * compressed (FlateDecode) or scanned PDFs the parenthesised groups it matches
 * are raw binary, not text — so we measure the ratio of printable ASCII in the
 * recovered string and return "" when it looks like binary. Returning "" lets
 * the caller store the document with an "uploaded" status instead of persisting
 * gibberish (and, before sanitising was added, crashing the insert on NUL bytes).
 */
function extractTextStreamsFromPdfBuffer(buf: Buffer): string {
  try {
    const raw = buf.toString("latin1");
    const matches = raw.match(/\(([^()\\]|\\.)*\)/g);
    if (!matches || matches.length < 5) return "";
    const textPieces = matches
      .map((m) => m.slice(1, -1).replace(/\\/g, ""))
      .filter((s) => /[a-zA-Z]{3,}/.test(s));
    const joined = textPieces.join(" ").replace(/\s+/g, " ").trim();
    if (!joined || joined.length < 30) return "";
    // Reject binary masquerading as text: real extracted text is overwhelmingly
    // printable. Non-printable bytes here mean we scraped a compressed stream.
    const printable = joined.replace(/[^\x20-\x7E\n\r\t]/g, "").length;
    if (printable / joined.length < 0.85) return "";
    if (joined.length > 50_000) return joined.slice(0, 50_000);
    return joined;
  } catch {
    return "";
  }
}

/** Split text into overlapping chunks for embedding + retrieval. */
export function chunkText(text: string, size = 800, overlap = 120): string[] {
  return chunkTextWithPages(text, size, overlap).map((c) => c.content);
}

/**
 * Page-aware chunking: same splitting strategy as chunkText, but each chunk
 * records which document page it started on (1-based) using the char offsets
 * emitted by extractDocument.
 */
export function chunkTextWithPages(
  text: string,
  size = 800,
  overlap = 120,
  pageOffsets: number[] = []
): { content: string; page: number | null }[] {
  const clean = text.replace(/\r/g, "").trim();
  if (!clean) return [];

  const pageAt = (offset: number): number | null => {
    if (pageOffsets.length === 0) return null;
    let page = 1;
    for (let i = 0; i < pageOffsets.length; i++) {
      if (pageOffsets[i] <= offset) page = i + 1;
      else break;
    }
    return page;
  };

  const paragraphs = clean.split(/\n\s*\n/).filter(Boolean);
  const chunks: { content: string; page: number | null }[] = [];
  let consumed = 0;
  const pushChunk = (content: string, startOffset: number) => {
    chunks.push({ content, page: pageAt(startOffset) });
  };

  let current = "";
  let currentStart = 0;
  for (const para of paragraphs) {
    const paraStart = text.indexOf(para.slice(0, 80), consumed);
    if (current.length + para.length > size && current) {
      pushChunk(current.trim(), currentStart);
      if (para.length > size) {
        const rest = para.slice(0, size);
        pushChunk(rest.trim(), paraStart >= 0 ? paraStart : consumed);
        let cursor = size;
        for (let i = size; i < para.length; i += size - overlap) {
          pushChunk(para.slice(i, i + size).trim(), (paraStart >= 0 ? paraStart : consumed) + i);
          cursor = i + size;
        }
        current = "";
        consumed = (paraStart >= 0 ? paraStart : consumed) + Math.min(cursor, para.length);
        continue;
      }
      current = para;
      currentStart = paraStart >= 0 ? paraStart : consumed;
      consumed = currentStart + para.length;
      continue;
    }
    if (!current) currentStart = paraStart >= 0 ? paraStart : consumed;
    current = current ? `${current}\n\n${para}` : para;
    consumed += para.length + 2;
  }
  if (current.trim()) pushChunk(current.trim(), currentStart);
  return chunks.filter((c) => c.content);
}

/** Simple deterministic key-entity extraction (used when no NLP service). */
export function extractEntities(text: string): {
  kind: string;
  value: string;
}[] {
  const entities: { kind: string; value: string }[] = [];
  const lower = text.toLowerCase();

  const inr = text.match(/(?:Rs\.?|₹|INR)\s?([\d,]+(?:\.\d+)?)/g);
  if (inr) entities.push({ kind: "amount", value: inr[0] });

  const dates = text.match(
    /\b(0?[1-9]|[12]\d|3[01])\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4}\b/gi
  );
  if (dates) entities.push({ kind: "date", value: dates[0] });

  const sections = text.match(
    /\b(?:section|sec)\s?\d+[a-z]?/gi
  );
  if (sections) entities.push({ kind: "section", value: sections[0] });

  const cnr = text.match(/\b[A-Z]{2,4}\d{10,}\b/);
  if (cnr) entities.push({ kind: "case_number", value: cnr[0] });

  for (const kw of ["penalty", "fine", "arbitration", "notice", "surrender", "termination", "confidentiality", "indemnity"]) {
    if (lower.includes(kw)) entities.push({ kind: "clause", value: kw });
  }

  return entities.slice(0, 40);
}

export async function createDocumentRecord(input: {
  userId: string;
  matterId?: string | null;
  name: string;
  mimeType: string;
  sizeBytes: number;
  extractedText?: string | null;
  pageOffsets?: number[];
}) {
  // Final guard at the DB boundary: never let a NUL/control byte reach the
  // Postgres `text` column, regardless of which caller produced the string.
  // A single NUL aborts the whole insert (the /api/documents/upload 500).
  const cleaned =
    input.extractedText != null ? sanitizeText(input.extractedText) : input.extractedText;
  const hasText = typeof cleaned === "string" && cleaned.trim().length > 0;

  const [row] = await db
    .insert(documents)
    .values({
      userId: input.userId,
      matterId: input.matterId ?? null,
      name: input.name,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      extractedText: cleaned,
      pageOffsets: input.pageOffsets ?? null,
      status: hasText ? "processing" : "uploaded",
      kind: inferKind(input.name),
    })
    .returning();
  return row;
}

export function inferKind(name: string): "fir" | "legal_notice" | "court_order" | "agreement" | "petition" | "contract" | "evidence" | "judgment" | "letter" | "other" {
  const lower = name.toLowerCase();
  if (/rent|lease|tenancy|deposit/.test(lower)) return "agreement";
  if (/nda|non-disclosure|confidentiality/.test(lower)) return "contract";
  if (/complaint/.test(lower)) return "petition";
  if (/notice/.test(lower)) return "legal_notice";
  if (/contract|agreement/.test(lower)) return "contract";
  if (/petition/.test(lower)) return "petition";
  if (/judgment|order/.test(lower)) return "judgment";
  if (/affidavit/.test(lower)) return "evidence";
  if (/id proof|aadhaar|pan|voter/.test(lower)) return "evidence";
  if (/invoice|receipt|bank|statement/.test(lower)) return "evidence";
  if (/fir/.test(lower)) return "fir";
  if (/letter/.test(lower)) return "letter";
  return "other";
}

export async function analyzeDocument(
  documentId: string,
  extractedText: string,
  pageOffsets: number[] = []
) {
  const nlp = await analyzeWithNlpService(extractedText);
  const entities = (nlp?.entities ?? extractEntities(extractedText)).slice(0, 60);
  await db.delete(documentEntities).where(eq(documentEntities.documentId, documentId));
  for (const ent of entities.slice(0, 60)) {
    await db
      .insert(documentEntities)
      .values({ documentId, kind: ent.kind, value: ent.value })
      .onConflictDoNothing();
  }

  const saved = await embedDocumentChunks(documentId, extractedText, pageOffsets);

  const summary = buildSummary(extractedText, entities);
  await db
    .update(documents)
    .set({
      status: "analyzed",
      summary,
      analysis: {
        entities: entities.slice(0, 60),
        chunks: saved,
        nlp: nlp
          ? { obligations: nlp.obligations, deadlines: nlp.deadlines, risks: nlp.risks }
          : undefined,
      },
      updatedAt: new Date(),
    })
    .where(eq(documents.id, documentId));

  return { entities: entities.slice(0, 60), chunks: saved, summary };
}

function buildSummary(
  text: string,
  entities: { kind: string; value: string }[]
): string {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter((l) => l.length > 20);
  const firstLines = lines.slice(0, 2).join(" ");
  const kinds = Array.from(new Set(entities.map((e) => e.kind)));
  const count = entities.length;
  return `${firstLines ? firstLines.slice(0, 240) + ". " : ""}Identified ${count} entities across categories: ${kinds.join(", ")}.`;
}

export async function embedDocumentChunks(
  documentId: string,
  text: string,
  pageOffsets: number[] = []
): Promise<number> {
  const chunks = chunkTextWithPages(text, 800, 120, pageOffsets);
  if (chunks.length === 0) return 0;
  await db.delete(documentChunks).where(eq(documentChunks.documentId, documentId));

  let saved = 0;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    let vector: number[] | null = null;
    try {
      const res = await embed(chunk.content);
      vector = res.vector;
    } catch {
      // Embedding optional (keyword retrieval still works)
    }
    await db.insert(documentChunks).values({
      documentId,
      chunkIndex: i,
      page: chunk.page,
      content: chunk.content,
      embedding: vector,
    });
    saved++;
  }
  return saved;
}
