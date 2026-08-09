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
  return {
    hearings,
    total: hearings.length,
    postponed: hearings.filter((item) => item.postponed).length,
    substantive: hearings.filter((item) => item.reason === "substantive hearing").length,
    unclear: hearings.filter((item) => item.reason === "reason unclear").length,
    averageGap: gaps.length ? Math.round(gaps.reduce((sum, value) => sum + value, 0) / gaps.length) : null,
    longestGap: gaps.length ? Math.max(...gaps) : null,
  };
}

function parseDate(value: string) {
  if (!value) return Number.NaN;
  const direct = Date.parse(value);
  if (Number.isFinite(direct)) return direct;
  const parts = value.split(/[/-]/).map(Number);
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return new Date(year < 100 ? 2000 + year : year, month - 1, day).getTime();
  }
  return Number.NaN;
}
