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
  if (mimeType === "text/plain") {
    return buf.toString("utf-8").slice(0, 400_000);
  }
  if (mimeType === "application/pdf") {
    return extractPdfText(buf);
  }
  // images and word docs: leave extraction to the legal-nlp service or OCR.
  return null;
}

async function extractPdfText(buf: Buffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buf) });
  const pdf = await loadingTask.promise;
  const pages: string[] = [];
  for (let i = 1; i <= Math.min(pdf.numPages, 100); i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: unknown) => ((item as { str?: string }).str ?? ""))
      .join(" ");
    pages.push(text);
  }
  return pages.join("\n\n").slice(0, 400_000);
}

/** Split text into overlapping chunks for embedding + retrieval. */
export function chunkText(text: string, size = 800, overlap = 120): string[] {
  const clean = text.replace(/\r/g, "").trim();
  if (!clean) return [];
  const paragraphs = clean.split(/\n\s*\n/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const para of paragraphs) {
    if (current.length + para.length > size && current) {
      chunks.push(current.trim());
      current = para.length > size ? para.slice(0, size) : para;
      if (para.length > size) {
        const rest = para.slice(size);
        for (let i = 0; i < rest.length; i += size - overlap) {
          chunks.push(rest.slice(i, i + size).trim());
        }
        current = "";
      }
      continue;
    }
    current = current ? `${current}\n\n${para}` : para;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
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

  for (const kw of ["penalty", "fine", "arbitration", "notice", "surrender"]) {
    if (lower.includes(kw)) entities.push({ kind: "clause", value: kw });
  }

  return entities.slice(0, 40);
}

export async function createDocumentRecord(input: {
  userId: string;
  matterId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  extractedText?: string | null;
}) {
  const [row] = await db
    .insert(documents)
    .values({
      userId: input.userId,
      matterId: input.matterId,
      name: input.name,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      extractedText: input.extractedText,
      status: input.extractedText ? "processing" : "uploaded",
      kind: inferKind(input.name),
    })
    .returning();
  return row;
}

export function inferKind(name: string): "fir" | "legal_notice" | "court_order" | "agreement" | "petition" | "contract" | "evidence" | "judgment" | "letter" | "other" {
  const lower = name.toLowerCase();
  if (/rent|lease|tenancy|deposit/.test(lower)) return "agreement";
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
  extractedText: string
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

  const chunks = chunkText(extractedText);
  await db.delete(documentChunks).where(eq(documentChunks.documentId, documentId));
  let saved = 0;
  for (let i = 0; i < chunks.length; i++) {
    try {
      const { vector } = await embed(chunks[i]);
      await db.insert(documentChunks).values({
        documentId,
        content: chunks[i],
        chunkIndex: i,
        embedding: vector as never,
      });
      saved++;
    } catch (err) {
      logger.warn("chunk_embed_failed", {
        documentId,
        index: i,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

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

function buildSummary(text: string, entities: { kind: string; value: string }[]): string {
  const first = text.slice(0, 500).replace(/\s+/g, " ").trim();
  const parts: string[] = [];
  const amounts = entities.filter((e) => e.kind === "amount").map((e) => e.value);
  const dates = entities.filter((e) => e.kind === "date").map((e) => e.value);
  if (amounts.length) parts.push(`Amounts: ${amounts.join(", ")}`);
  if (dates.length) parts.push(`Dates: ${dates.join(", ")}`);
  if (parts.length === 0) return `${first}…`;
  return `${first.slice(0, 300)}… (${parts.join(" · ")})`;
}
