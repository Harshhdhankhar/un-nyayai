/**
 * PII detection layer for documents.
 *
 * Primary engine: Microsoft Presidio via the legal-nlp microservice
 * (`LEGAL_NLP_URL`). When the service is unavailable, deterministic local
 * regex recognizers (with checksum validation for Aadhaar/cards) keep the
 * pipeline working offline.
 *
 * This module never logs detected values — only counts and entity types.
 */
import "server-only";
import { config, hasLegalNlp } from "@/lib/config";
import { logger } from "@/lib/logger";

export interface PiiFinding {
  entityType: string;
  text: string;
  confidence: number;
  /** Character offset into the full extracted text. */
  start: number;
  end: number;
  /** 1-based page number when known. */
  page: number | null;
}

export interface PiiResult {
  findings: PiiFinding[];
  engine: "presidio" | "regex" | "unavailable";
}

/* ----------------------- local regex recognizers ------------------------ */

const PAN_RE = /\b[A-Z]{5}\d{4}[A-Z]\b/g;
const AADHAAR_RE = /\b\d{4}\s?\d{4}\s?\d{4}\b/g;
const IFSC_RE = /\b[A-Z]{4}0[A-Z0-9]{6}\b/g;
const PHONE_IN_RE = /(?:\+91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b/g;
const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const CREDIT_CARD_RE = /\b(?:\d{4}[\s-]?){3}\d{4}\b/g;
const BANK_ACCOUNT_RE = /(a\/c|account)\s*(?:no\.?|number)?\s*[:\-]?\s*(\d{9,18})/gi;

/** Verhoeff checksum used by Aadhaar numbers. */
export function verhoeffValid(digits: string): boolean {
  const d = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 6, 7, 8, 0, 1, 2, 3, 4],
    [6, 7, 8, 9, 5, 3, 4, 0, 1, 2],
    [7, 8, 9, 5, 6, 4, 0, 1, 2, 3],
    [8, 9, 5, 6, 7, 5, 3, 4, 0, 1],
    [9, 5, 6, 7, 8, 1, 2, 3, 4, 0],
  ];
  const p = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
  ];
  let c = 0;
  const reversed = digits.split("").reverse();
  for (let i = 0; i < reversed.length; i++) {
    c = d[c][p[(i + 1) % 8][Number(reversed[i])]];
  }
  return c === 0;
}

/** Luhn checksum used by credit/debit card numbers. */
export function luhnValid(digits: string): boolean {
  let total = 0;
  const reversed = digits.split("").reverse();
  for (let i = 0; i < reversed.length; i++) {
    let d = Number(reversed[i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    total += d;
  }
  return total % 10 === 0;
}

interface RawMatch {
  entityType: string;
  start: number;
  end: number;
  confidence: number;
}

/** Deterministic Indian-identifier + contact recognizers. */
export function localPiiMatches(text: string): RawMatch[] {
  const out: RawMatch[] = [];
  const push = (
    re: RegExp,
    entityType: string,
    confidence: number,
    group?: number,
    validate?: (digits: string) => boolean,
    lowConfidence = 0.5
  ) => {
    for (const m of text.matchAll(re)) {
      const value = m[group ?? 0];
      if (!value) continue;
      let conf = confidence;
      if (validate) {
        const digits = value.replace(/\D/g, "");
        conf = validate(digits) ? confidence : lowConfidence;
      }
      const start = m.index + (group ? m[0].indexOf(value) : 0);
      out.push({ entityType, start, end: start + value.length, confidence: conf });
    }
  };
  push(PAN_RE, "PAN", 0.95);
  push(AADHAAR_RE, "AADHAAR", 0.97, undefined, verhoeffValid, 0.55);
  push(IFSC_RE, "IFSC", 0.95);
  push(PHONE_IN_RE, "PHONE_NUMBER", 0.85);
  push(EMAIL_RE, "EMAIL_ADDRESS", 0.99);
  push(CREDIT_CARD_RE, "CREDIT_CARD", 0.96, undefined, luhnValid, 0.5);
  for (const m of text.matchAll(BANK_ACCOUNT_RE)) {
    const value = m[2];
    if (!value) continue;
    const idx = m.index + m[0].lastIndexOf(value);
    out.push({ entityType: "BANK_ACCOUNT", start: idx, end: idx + value.length, confidence: 0.85 });
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Drop overlapping matches, keeping the higher-confidence one. */
export function dedupeOverlaps(matches: RawMatch[]): RawMatch[] {
  const ordered = [...matches].sort(
    (a, b) => b.confidence - a.confidence || b.end - b.start - (a.end - a.start)
  );
  const kept: RawMatch[] = [];
  for (const candidate of ordered) {
    const overlaps = kept.some((k) =>
      !(candidate.end <= k.start || candidate.start >= k.end)
    );
    if (!overlaps) kept.push(candidate);
  }
  return kept.sort((a, b) => a.start - b.start);
}

/* --------------------------- service client ----------------------------- */

async function detectPiiViaService(
  text: string
): Promise<{ findings: PiiFinding[]; engine: "presidio" | "regex" } | null> {
  if (!hasLegalNlp) return null;
  try {
    const res = await fetch(`${config.legalNlpUrl}/pii`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      entities?: { entity_type: string; text: string; confidence: number; start: number; end: number }[];
      engine?: string;
    };
    return {
      engine: data.engine === "presidio" ? "presidio" : "regex",
      findings: (data.entities ?? []).map((e) => ({
        entityType: e.entity_type,
        text: e.text,
        confidence: e.confidence,
        start: e.start,
        end: e.end,
        page: null,
      })),
    };
  } catch (err) {
    logger.warn("pii_service_unavailable", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

function pageForOffset(offset: number, pageOffsets: number[]): number | null {
  if (pageOffsets.length === 0) return null;
  let page = 1;
  for (let i = 0; i < pageOffsets.length; i++) {
    if (pageOffsets[i] <= offset) page = i + 1;
    else break;
  }
  return page;
}

/**
 * Detect PII in document text. Uses Presidio through the microservice when
 * configured; falls back to local recognizers otherwise. Results carry page
 * numbers derived from the extraction page offsets.
 */
export async function detectPii(
  text: string,
  pageOffsets: number[] = []
): Promise<PiiResult> {
  const fromService = await detectPiiViaService(text);
  let raw: RawMatch[];
  let engine: PiiResult["engine"];
  if (fromService) {
    // Union the service findings (Presidio when installed, regex otherwise)
    // with our deterministic Indian-identifier recognizers — Presidio's
    // pretrained model misses most of them — then drop overlapping spans.
    raw = dedupeOverlaps([
      ...localPiiMatches(text),
      ...fromService.findings
        .filter((f) => f.entityType !== "UK_NHS")
        .map((f) => ({
          entityType: f.entityType,
          start: f.start,
          end: f.end,
          confidence: f.confidence,
        })),
    ]);
    engine = fromService.engine;
  } else {
    raw = dedupeOverlaps(localPiiMatches(text));
    engine = "regex";
  }

  const findings: PiiFinding[] = raw
    .filter((m) => {
      const value = text.slice(m.start, m.end);
      // Drop Presidio false positives that tag bare numbers as dates.
      if (m.entityType === "DATE_TIME" && /^\d+$/.test(value.trim())) {
        return false;
      }
      // Legal documents shout headings in ALL CAPS — Presidio's model reads
      // them as person names. Single uppercase words are almost never names.
      if (
        m.entityType === "PERSON" &&
        /^[A-Z][A-Z\s&\-']{3,}$/.test(value.trim())
      ) {
        return false;
      }
      return true;
    })
    .map((m) => ({
    entityType: m.entityType,
    text: text.slice(m.start, m.end),
    confidence: m.confidence,
    start: m.start,
    end: m.end,
    page: pageForOffset(m.start, pageOffsets),
  }));

  return { findings, engine };
}

/**
 * Produce a redacted copy of the text with every finding replaced by a
 * typed placeholder like [PHONE_NUMBER]. Never logs the redacted values.
 */
export function redactText(text: string, findings: PiiFinding[]): string {
  if (findings.length === 0) return text;
  const sorted = [...findings].sort((a, b) => a.start - b.start);
  let out = "";
  let cursor = 0;
  for (const f of sorted) {
    if (f.start < cursor || f.start > f.end || f.end > text.length) continue;
    out += text.slice(cursor, f.start);
    out += `[${f.entityType}]`;
    cursor = f.end;
  }
  out += text.slice(cursor);
  return out;
}

/**
 * Build a function that substitutes [TYPE] placeholders back with the
 * ORIGINAL detected values. Used to make stored analysis reports readable
 * for the document owner AFTER the LLM has processed only redacted text —
 * raw PII never leaves the server.
 */
export function makePlaceholderRestorer(
  findings: PiiFinding[]
): (input: string) => string {
  const queues = new Map<string, string[]>();
  for (const f of [...findings].sort((a, b) => a.start - b.start)) {
    const q = queues.get(f.entityType) ?? [];
    q.push(f.text);
    queues.set(f.entityType, q);
  }
  return (input: string) =>
    input.replace(/\[([A-Z][A-Z_]{2,})\]/g, (match, type: string) => {
      const q = queues.get(type);
      if (!q || q.length === 0) return match;
      const value = q.shift()!;
      q.push(value); // cycle when the model repeats a placeholder
      return value;
    });
}
