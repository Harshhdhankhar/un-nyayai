/* =========================================================================
 * Workbench shared text / matching helpers. Pure & deterministic.
 * ========================================================================= */

import type { MatterBundle } from "@/lib/intelligence/inputs";

const STOPWORDS = new Set([
  "about","after","again","against","all","also","am","an","and","any","are",
  "as","at","be","been","before","being","between","but","by","can","could",
  "did","do","does","doing","down","for","from","had","has","have","having",
  "he","her","here","hers","him","his","how","i","if","in","into","is","it",
  "its","just","me","more","most","my","no","nor","not","now","of","off","on",
  "once","only","or","other","our","ours","out","over","own","said","same",
  "she","should","so","some","such","than","that","the","their","theirs","them",
  "then","there","these","they","this","those","through","to","too","under",
  "until","up","very","was","we","were","what","when","where","which","while",
  "who","whom","why","will","with","would","you","your","yours","this","that",
  "matter","case","said","stated","please","kindly","regarding","received",
  "one","two","yet","also","would","may","must","shall","cannot",
]);

/** Lowercase, whitespace-normalized, stopword-stripped token list. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

/** Distinct salient keywords (longest first), best-effort topic signature. */
export function salientKeywords(text: string, max = 8): string[] {
  const counts = new Map<string, number>();
  for (const w of tokenize(text)) counts.set(w, (counts.get(w) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, max)
    .map(([w]) => w);
}

/** Number of distinct keywords shared by two texts. */
export function keywordOverlap(a: string, b: string): number {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  let n = 0;
  for (const w of setA) if (setB.has(w)) n += 1;
  return n;
}

/** True when the fact text shares enough keywords with any document/evidence. */
export function hasCorroboration(bundle: MatterBundle, factText: string): boolean {
  const kws = salientKeywords(factText, 6);
  if (kws.length === 0) return false;
  const haystacks = [
    ...bundle.documents.map((d) => `${d.name} ${d.summary ?? ""} ${(d.extractedText ?? "").slice(0, 4000)}`),
    ...bundle.evidence
      .filter((e) => e.status === "available")
      .map((e) => `${e.title} ${e.description ?? ""}`),
  ];
  return haystacks.some((h) => {
    const setH = new Set(tokenize(h));
    return kws.filter((k) => setH.has(k)).length >= 2;
  });
}

/** Evidence items that plausibly support a fact text. */
export function evidenceFor(bundle: MatterBundle, text: string): string[] {
  const kws = new Set(tokenize(text));
  if (kws.size === 0) return [];
  return bundle.evidence
    .filter((e) => {
      const h = new Set(tokenize(`${e.title} ${e.description ?? ""} ${e.provenance ?? ""}`));
      let n = 0;
      for (const k of kws) if (h.has(k)) n += 1;
      return n >= 2;
    })
    .map((e) => e.id);
}

/** Documents that plausibly support a fact text. */
export function documentsFor(bundle: MatterBundle, text: string): string[] {
  const kws = new Set(tokenize(text));
  if (kws.size === 0) return [];
  return bundle.documents
    .filter((d) => {
      const h = new Set(tokenize(`${d.name} ${d.summary ?? ""} ${(d.extractedText ?? "").slice(0, 3000)}`));
      let n = 0;
      for (const k of kws) if (h.has(k)) n += 1;
      return n >= 2;
    })
    .map((d) => d.id);
}

/** Build a deterministic id sequence (no Date/random). */
export function seqId(prefix: string): () => string {
  let n = 0;
  return () => {
    n += 1;
    return `${prefix}-${n}`;
  };
}
