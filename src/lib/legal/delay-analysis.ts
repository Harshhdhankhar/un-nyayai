import type { ECourtHearing } from "@/lib/providers/ecourts/types";

export type DelayReason = "time sought" | "counsel unavailable" | "evidence unavailable" | "party absent" | "court unavailable" | "administrative reason" | "substantive hearing" | "reason unclear";

export interface ClassifiedHearing extends ECourtHearing {
  reason: DelayReason;
  postponed: boolean;
  gapDays: number | null;
}

const DAY = 86_400_000;

export function classifyHearing(hearing: ECourtHearing): DelayReason {
  const text = `${hearing.purpose} ${hearing.result} ${hearing.orderSummary}`.toLowerCase();
  if (/time sought|seeks? time|adjourn.*request|on request/.test(text)) return "time sought";
  if (/counsel.*(absent|unavailable)|lawyer.*(absent|unavailable)|advocate.*(absent|unavailable)/.test(text)) return "counsel unavailable";
  if (/evidence.*(not|unavailable|await)|document.*(not|await)|record.*await/.test(text)) return "evidence unavailable";
  if (/party.*absent|non.?appearance|none.*appear/.test(text)) return "party absent";
  if (/judge.*(leave|unavailable)|court.*(unavailable|holiday)|presiding officer.*leave/.test(text)) return "court unavailable";
  if (/administrative|transfer|roster|board|not reached/.test(text)) return "administrative reason";
  if (/argument|evidence recorded|cross.?examin|judgment|order pronounced|hearing concluded|disposed/.test(text)) return "substantive hearing";
  return "reason unclear";
}

export function analyzeHearings(history: ECourtHearing[]) {
  const sorted = [...history].sort((a, b) => parseDate(a.hearingDate) - parseDate(b.hearingDate));
  const hearings: ClassifiedHearing[] = sorted.map((hearing, index) => {
    const reason = classifyHearing(hearing);
    const current = parseDate(hearing.hearingDate);
    const previous = index ? parseDate(sorted[index - 1].hearingDate) : Number.NaN;
    const gapDays = Number.isFinite(current) && Number.isFinite(previous) ? Math.max(0, Math.round((current - previous) / DAY)) : null;
    return { ...hearing, reason, postponed: reason !== "substantive hearing" && /adjourn|postpon|next date|defer|time sought|absent|not reached/i.test(`${hearing.purpose} ${hearing.result}`), gapDays };
  });
  const gaps = hearings.map((item) => item.gapDays).filter((value): value is number => value !== null);

  const byReason: Record<DelayReason, number> = {
    "time sought": 0,
    "counsel unavailable": 0,
    "evidence unavailable": 0,
    "party absent": 0,
    "court unavailable": 0,
    "administrative reason": 0,
    "substantive hearing": 0,
    "reason unclear": 0,
  };
  for (const item of hearings) byReason[item.reason] += 1;

  // Time pending: span from the earliest to the latest recorded hearing.
  const dated = sorted.map((h) => parseDate(h.hearingDate)).filter(Number.isFinite) as number[];
  const timePendingDays = dated.length >= 2 ? Math.max(0, Math.round((Math.max(...dated) - Math.min(...dated)) / DAY)) : null;

  const medianGap = median(gaps);
  const knownAttribution = hearings.length - byReason["reason unclear"];

  return {
    hearings,
    total: hearings.length,
    postponed: hearings.filter((item) => item.postponed).length,
    substantive: hearings.filter((item) => item.reason === "substantive hearing").length,
    unclear: hearings.filter((item) => item.reason === "reason unclear").length,
    averageGap: gaps.length ? Math.round(gaps.reduce((sum, value) => sum + value, 0) / gaps.length) : null,
    medianGap: medianGap === null ? null : Math.round(medianGap),
    longestGap: gaps.length ? Math.max(...gaps) : null,
    timePendingDays,
    byReason,
    attribution: { known: knownAttribution, unknown: byReason["reason unclear"] },
  };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/* --------------------------- reason taxonomy ---------------------------- */

/**
 * Normalized delay-reason taxonomy (Delay Analysis V2). The raw hearing text
 * is preserved; this maps each classified reason to a stable machine label.
 * Uncertain data is never forced into a specific bucket.
 */
export type DelayReasonTaxonomy =
  | "PARTY_REQUESTED_TIME"
  | "COUNSEL_UNAVAILABLE"
  | "COURT_UNAVAILABLE"
  | "SERVICE_PENDING"
  | "DOCUMENT_PENDING"
  | "EVIDENCE_PENDING"
  | "ADMINISTRATIVE"
  | "ADJOURNED_WITHOUT_CLEAR_REASON"
  | "SUBSTANTIVE_PROGRESS"
  | "OTHER"
  | "UNKNOWN";

const TAXONOMY: Record<DelayReason, DelayReasonTaxonomy> = {
  "time sought": "PARTY_REQUESTED_TIME",
  "counsel unavailable": "COUNSEL_UNAVAILABLE",
  "evidence unavailable": "EVIDENCE_PENDING",
  "party absent": "OTHER",
  "court unavailable": "COURT_UNAVAILABLE",
  "administrative reason": "ADMINISTRATIVE",
  "substantive hearing": "SUBSTANTIVE_PROGRESS",
  "reason unclear": "ADJOURNED_WITHOUT_CLEAR_REASON",
};

export function normalizeDelayReason(reason: DelayReason): DelayReasonTaxonomy {
  return TAXONOMY[reason] ?? "UNKNOWN";
}

export interface TaxonomizedHearing extends ClassifiedHearing {
  taxonomy: DelayReasonTaxonomy;
}

/** Attach the normalized taxonomy to each classified hearing. */
export function taxonomizeHearings(history: ECourtHearing[]): TaxonomizedHearing[] {
  return analyzeHearings(history).hearings.map((h) => ({ ...h, taxonomy: normalizeDelayReason(h.reason) }));
}

/* ------------------------- pattern explanation -------------------------- */

/**
 * Source-backed narrative of a delay pattern. Never claims motive — it states
 * literal, countable observations from the record.
 */
export function explainDelayPattern(analysis: ReturnType<typeof analyzeHearings>): string | null {
  if (analysis.total === 0) return null;
  const { byReason } = analysis;
  const total = analysis.total;
  const parts: string[] = [];

  const recent = analysis.hearings.slice(-7);
  const recentEvidence = recent.filter((h) => {
    const tax = normalizeDelayReason(h.reason);
    if (tax === "EVIDENCE_PENDING" || tax === "SUBSTANTIVE_PROGRESS") return true;
    return /evidence|recording|cross.?examin/i.test(`${h.purpose ?? ""} ${h.result ?? ""}`);
  }).length;
  if (recent.length >= 4 && recentEvidence >= Math.ceil(recent.length / 2)) {
    parts.push(`${recentEvidence} of the last ${recent.length} recorded hearings did not move beyond evidence-related proceedings.`);
  }

  if (byReason["time sought"] >= 3) {
    parts.push(`${byReason["time sought"]} recorded listings were adjourned on a request for time.`);
  }
  if (byReason["counsel unavailable"] >= 2) {
    parts.push(`${byReason["counsel unavailable"]} listings were adjourned because counsel was unavailable.`);
  }
  if (analysis.medianGap !== null && analysis.averageGap !== null && analysis.medianGap > 0 && analysis.averageGap > analysis.medianGap * 1.5) {
    parts.push(`A few long intervals pull the average gap (${analysis.averageGap} days) well above the typical gap (${analysis.medianGap} days).`);
  }
  if (parts.length === 0) {
    parts.push(`Across ${total} recorded listings, ${analysis.postponed} were adjournments and ${analysis.substantive} were substantive hearings.`);
  }
  return parts.join(" ");
}

function parseDate(value: string) {
  if (!value) return Number.NaN;
  const parts = value.split(/[/-]/);
  // dd/mm/yyyy or dd-mm-yyyy (day first, 4-digit year last). Checked BEFORE
  // Date.parse because Date.parse treats "03/04/2026" as US mm/dd/yyyy
  // (March 4) instead of Indian dd/mm/yyyy (April 3) — silently swapping
  // day and month whenever the day-of-month is <= 12.
  if (parts.length === 3) {
    const day = Number(parts[0]);
    const month = Number(parts[1]);
    const yearRaw = Number(parts[2]);
    if (
      /^\d+$/.test(parts[0]) &&
      /^\d+$/.test(parts[1]) &&
      /^\d+$/.test(parts[2]) &&
      day >= 1 && day <= 31 &&
      month >= 1 && month <= 12
    ) {
      const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
      const t = new Date(year, month - 1, day).getTime();
      if (!Number.isNaN(t)) return t;
    }
  }
  const direct = Date.parse(value);
  if (Number.isFinite(direct)) return direct;
  return Number.NaN;
}
