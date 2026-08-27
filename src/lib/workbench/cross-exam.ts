import "server-only";
import { getMatterDetail } from "@/lib/matters/service";
import { retrieveDocumentChunks } from "@/lib/retrieval/documents";
import { extractAmounts, extractDates } from "@/lib/intelligence/extract";
import type { CrossExamMatch, CrossExamResult } from "./types";

/* =========================================================================
 * Document Cross-Examination — ask a question ACROSS all Matter documents.
 *
 * Answers come from the documents (retrieval + exact substring scan), never
 * from memory. Returns the matching passages with document + page, and flags
 * any documents that give conflicting values for the queried term.
 * ========================================================================= */

interface DocText {
  id: string;
  name: string;
  extractedText: string;
  summary: string;
}

/** Return the sentences in `text` that contain the query terms. */
function passagesFor(text: string, query: string): string[] {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3);
  if (tokens.length === 0) return [];
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.;])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8 && s.length < 500)
    .filter((s) => tokens.filter((t) => s.toLowerCase().includes(t)).length >= Math.min(2, tokens.length));
}

export async function answerDocumentQuestion(
  userId: string,
  matterId: string,
  question: string
): Promise<CrossExamResult> {
  const detail = await getMatterDetail(userId, matterId);
  if (!detail) {
    return { question, answer: "Matter not found.", matches: [], conflicts: [], answeredFromDocuments: false };
  }
  const docs: DocText[] = detail.documents
    .filter((d) => d.extractedText || d.summary)
    .map((d) => ({ id: d.id, name: d.name, extractedText: d.extractedText ?? "", summary: d.summary ?? "" }));
  if (docs.length === 0) {
    return {
      question,
      answer: "No documents with extractable text are uploaded for this matter, so nothing could be searched.",
      matches: [],
      conflicts: [],
      answeredFromDocuments: false,
    };
  }

  // 1) RAG retrieval on chunks.
  const chunkMatches: CrossExamMatch[] = [];
  try {
    const hits = await retrieveDocumentChunks(question, { userId, matterId, k: 8 });
    for (const h of hits) {
      chunkMatches.push({ documentName: h.documentName, documentId: h.documentId, page: h.page, passage: h.content });
    }
  } catch {
    // fall through to exact scan
  }

  // 2) Exact substring scan across full document text.
  const matches: CrossExamMatch[] = [...chunkMatches];
  const seen = new Set<string>();
  for (const d of docs) {
    for (const p of passagesFor(`${d.extractedText} ${d.summary}`, question)) {
      const key = `${d.name}|${p}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push({ documentName: d.name, documentId: d.id, page: null, passage: p });
    }
  }

  // 3) Conflicts: if the question names a date/amount, compare distinct values
  //    across documents and surface documents that disagree.
  const conflicts: CrossExamMatch[] = [];
  const termAmount = extractAmounts(question)[0];
  const termDate = extractDates(question)[0];
  if (termAmount || termDate) {
    const byValue = new Map<string, string[]>();
    for (const d of docs) {
      const text = `${d.extractedText} ${d.summary}`;
      const values = termAmount
        ? extractAmounts(text).map((a) => `₹${a.value.toLocaleString("en-IN")}`)
        : extractDates(text).map((x) => x.raw);
      for (const v of values) {
        const arr = byValue.get(v) ?? [];
        if (!arr.includes(d.name)) arr.push(d.name);
        byValue.set(v, arr);
      }
    }
    if (byValue.size > 1) {
      for (const [v, names] of byValue) {
        conflicts.push({ documentName: names[0], documentId: "", page: null, passage: `${v} — appears in ${names.length} document(s)` });
      }
    }
  }

  const uniqueMatches = dedupe(matches);
  const answer = uniqueMatches.length
    ? `Found ${uniqueMatches.length} passage(s) mentioning this across your documents.` +
      (conflicts.length
        ? ` Different values for this term appear across documents (${[...new Set(conflicts.map((c) => c.documentName))].join(", ")}).`
        : "")
    : "No passage in the uploaded documents mentions this. If you expected it, the term may be phrased differently or the document may not have been fully extracted.";

  return {
    question,
    answer,
    matches: uniqueMatches.slice(0, 12),
    conflicts,
    answeredFromDocuments: true,
  };
}

function dedupe(items: CrossExamMatch[]): CrossExamMatch[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    const k = `${i.documentName}|${i.page ?? ""}|${i.passage.slice(0, 80)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
