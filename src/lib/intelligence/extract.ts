/* =========================================================================
 * Deterministic extraction & normalization.
 *
 * Pure, rule-based parsing of amounts, dates, case numbers and court
 * directives from free text. No LLM, no network, no database — every value
 * this produces can be traced to a literal substring of the input, which is
 * what keeps the intelligence layer honest.
 * ========================================================================= */

export interface ExtractedAmount {
  raw: string;
  /** Numeric rupees, best-effort. */
  value: number;
}

export interface ExtractedDate {
  raw: string;
  /** ISO yyyy-mm-dd when parseable, else null. */
  iso: string | null;
}

export interface ExtractedDirective {
  text: string;
  /** Detected addressee: respondent | petitioner | plaintiff | defendant | parties | "". */
  addressee: string;
  /** Timeframe like "two weeks", when present. */
  timeframe: string | null;
  /** Parsed timeframe in days, when derivable. */
  timeframeDays: number | null;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  fortnight: 14,
};

export function extractAmounts(text: string): ExtractedAmount[] {
  const out: ExtractedAmount[] = [];
  const seen = new Set<number>();
  const re = /(?:rs\.?|₹|inr)\s?([\d,]+(?:\.\d+)?)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const value = Number(m[1].replace(/,/g, ""));
    if (!Number.isFinite(value) || value <= 0) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    out.push({ raw: m[0].trim(), value });
  }
  return out;
}

/** Parse a loose date string (Indian day-first convention) into ISO. */
export function parseDateLoose(value: string): string | null {
  if (!value) return null;
  const v = value.trim();
  // yyyy-mm-dd (already ISO-ish)
  const iso = v.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) {
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${iso[1]}-${iso[2]}-${iso[3]}`;
    }
    return null;
  }
  // dd Mon yyyy
  const words = v.match(/\b(\d{1,2})\s+([a-z]{3,})\s+(\d{2,4})\b/i);
  if (words) {
    const day = Number(words[1]);
    const mon = MONTHS[words[2].slice(0, 3).toLowerCase()];
    let year = Number(words[3]);
    if (year < 100) year += 2000;
    if (mon && day >= 1 && day <= 31) {
      return `${year}-${pad(mon)}-${pad(day)}`;
    }
  }
  // dd/mm/yyyy or dd-mm-yyyy (day first)
  const num = v.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (num) {
    const day = Number(num[1]);
    const mon = Number(num[2]);
    let year = Number(num[3]);
    if (year < 100) year += 2000;
    if (mon >= 1 && mon <= 12 && day >= 1 && day <= 31) {
      return `${year}-${pad(mon)}-${pad(day)}`;
    }
  }
  return null;
}

export function extractDates(text: string): ExtractedDate[] {
  const out: ExtractedDate[] = [];
  const seen = new Set<string>();
  const patterns = [
    /\b\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4}\b/gi,
    /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g,
    /\b\d{4}-\d{2}-\d{2}\b/g,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const raw = m[0].trim();
      const key = raw.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ raw, iso: parseDateLoose(raw) });
    }
  }
  return out;
}

export function extractCaseNumbers(text: string): string[] {
  const out = new Set<string>();
  // CNR-style
  const cnr = text.match(/\b[A-Z]{2,4}\d{10,}\b/g);
  if (cnr) cnr.forEach((c) => out.add(c));
  // "No. 123/2020" / "No. 123 of 2020"
  const num = text.match(/\bno\.?\s*\d+\s*(?:\/|of)\s*\d{4}\b/gi);
  if (num) num.forEach((c) => out.add(c.replace(/\s+/g, " ").trim()));
  return [...out];
}

/** Map a spelled-out or numeric timeframe to a day count. */
export function timeframeToDays(phrase: string): number | null {
  const p = phrase.toLowerCase();
  const numMatch = p.match(/(\d+)/);
  const wordMatch = Object.keys(WORD_NUMBERS).find((w) => p.includes(w));
  const n: number | null = numMatch ? Number(numMatch[1]) : wordMatch ? WORD_NUMBERS[wordMatch] : null;
  // "a month" / "a year": no number token, but the unit still implies a count.
  const qty = n ?? 1;
  if (p.includes("fortnight")) return 14;
  if (/week/.test(p)) return qty * 7;
  if (/month/.test(p)) return qty * 30;
  if (/year/.test(p)) return qty * 365;
  if (/day/.test(p)) return qty;
  return null;
}

const DIRECTIVE_RE =
  /\b(?:directed to|is directed|are directed|shall (?:file|submit|produce|furnish|pay|deposit|appear)|to (?:file|submit|produce|furnish)|list(?:ed)? (?:on|for)|posted? (?:on|to)|adjourned to|put up on|matter (?:is )?adjourned|reply within|counter within|affidavit within)\b/i;

const ADDRESSEE_RE = /\b(respondent|petitioner|plaintiff|defendant|complainant|opposite party|parties|both parties)\b/i;

const TIMEFRAME_RE =
  /\bwithin\s+((?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|a)\s*(?:days?|weeks?|months?|years?)|fortnight)\b/i;

/** Split order text into sentence-ish units and pull out directive statements. */
export function extractDirectives(text: string): ExtractedDirective[] {
  if (!text) return [];
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.;])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8 && s.length < 400);

  const out: ExtractedDirective[] = [];
  const seen = new Set<string>();
  for (const s of sentences) {
    if (!DIRECTIVE_RE.test(s)) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const addressee = s.match(ADDRESSEE_RE)?.[1]?.toLowerCase() ?? "";
    const tf = s.match(TIMEFRAME_RE)?.[1] ?? null;
    out.push({
      text: s,
      addressee,
      timeframe: tf,
      timeframeDays: tf ? timeframeToDays(tf) : null,
    });
    if (out.length >= 25) break;
  }
  return out;
}

/** Normalize a person / party name for loose equality comparison. */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(sri|shri|smt|mr|mrs|ms|m\/s|dr|the|state of|union of india)\b/g, "")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
