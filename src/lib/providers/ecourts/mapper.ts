import "server-only";
import type { ECourtCaseDetail, ECourtSearchResult } from "./types";

export interface CaseSummary {
  humanSummary: string;
  timeline: { date: string; title: string; description: string; source: "ecourts"; confidence: number; editable: boolean }[];
  currentStageExplanation: string;
  upcomingHearing: { date: string | null; note: string };
  whatHappenedLast: string;
  whatToPrepare: string[];
  isDemo: boolean;
}

/* =========================================================================
 * Mappers for the verified eCourtsIndia API shapes.
 *
 * Case detail envelope: { courtCaseData, entityInfo, files, descriptions, caseAiAnalysis }
 * ========================================================================= */

interface ApiHearing {
  hearingDate?: string;
  purposeOfListing?: string;
  purpose?: string;
  hearingResult?: string;
  result?: string;
  judge?: string;
}

interface ApiOrder {
  orderDate?: string;
  orderType?: string;
  orderUrl?: string;
}

/** Map a verified eCourtsIndia case detail payload into the internal contract. */
export function mapCaseDetail(raw: unknown): ECourtCaseDetail {
  const d = (raw ?? {}) as Record<string, unknown>;
  const ccd = (d.courtCaseData ?? {}) as Record<string, unknown>;
  const entity = (d.entityInfo ?? {}) as Record<string, unknown>;

  const caseStatus = String(ccd.caseStatus ?? "").toUpperCase();
  const status: ECourtCaseDetail["record"]["caseStatus"] =
    caseStatus === "DISPOSED" ? "disposed" : caseStatus ? "pending" : "unknown";

  const petitioners = (ccd.petitioners ?? []) as string[];
  const respondents = (ccd.respondents ?? []) as string[];
  const judges = (ccd.judges ?? []) as string[];

  const history = ((ccd.historyOfCaseHearings ?? []) as ApiHearing[]).map(
    (h) => ({
      hearingDate: h.hearingDate ?? "",
      purpose: h.purposeOfListing ?? h.purpose ?? "Hearing",
      result: h.hearingResult ?? h.result ?? "",
      orderSummary: "",
    })
  );

  const orders = ((ccd.judgmentOrders ?? []) as ApiOrder[]).map((o) => ({
    orderDate: o.orderDate ?? "",
    orderType: o.orderType ?? "Order",
    summary: "",
    url: o.orderUrl,
  }));

  return {
    record: {
      cnr: String(ccd.cnr ?? ""),
      courtName: String(ccd.courtName ?? ""),
      courtCode: String(ccd.cnrCourtCode ?? ""),
      caseNumber: String(ccd.caseNumber ?? ""),
      caseType: String(ccd.caseType ?? ""),
      caseTypeRaw: String(ccd.caseTypeRaw ?? ccd.caseType ?? ""),
      caseCategory: String(ccd.caseTypeRaw ?? ""),
      caseStatus: status,
      petitioner: petitioners[0] ?? "",
      respondent: respondents[0] ?? "",
      filingDate: String(ccd.filingDate ?? ""),
      firstHearingDate: ccd.firstHearingDate ? String(ccd.firstHearingDate) : null,
      decisionDate: ccd.decisionDate ? String(ccd.decisionDate) : null,
      judge: judges.join(", "),
      stage: String(ccd.caseStatusRaw ?? ccd.caseStatus ?? ""),
      nextHearingDate: entity.nextDateOfHearing
        ? String(entity.nextDateOfHearing).slice(0, 10)
        : null,
    },
    history,
    orders,
    isDemo: false,
    parties: { petitioners, respondents },
    advocates: {
      petitioners: (ccd.petitionerAdvocates ?? []) as string[],
      respondents: (ccd.respondentAdvocates ?? []) as string[],
    },
    judges,
    orderCount: Number(ccd.orderCount ?? orders.length),
  };
}

/** Map a verified eCourtsIndia search row into the search result contract. */
export function mapSearchRow(row: unknown): ECourtSearchResult {
  const r = (row ?? {}) as Record<string, unknown>;
  return {
    cnr: String(r.cnr ?? ""),
    caseType: String(r.caseType ?? ""),
    caseStatus: String(r.caseStatus ?? ""),
    courtName: String(r.courtName ?? ""),
    filingDate: String(r.filingDate ?? ""),
    registrationNumber: String(r.registrationNumber ?? r.registrationNumber ?? ""),
    nextHearingDate: r.nextHearingDate ? String(r.nextHearingDate).slice(0, 10) : null,
    decisionDate: r.decisionDate ? String(r.decisionDate).slice(0, 10) : null,
    petitioners: (r.petitioners ?? []) as string[],
    respondents: (r.respondents ?? []) as string[],
    judges: (r.judges ?? []) as string[],
  };
}

/** Transform the internal contract into a human-readable case summary. */
export function mapCaseToSummary(caseData: ECourtCaseDetail): CaseSummary {
  const { record, history, orders } = caseData;
  const hearings = history ?? [];
  const last = hearings[hearings.length - 1];

  const timeline = [
    {
      date: record.filingDate,
      title: "Case filed",
      description: `${record.petitioner} vs ${record.respondent}`,
      source: "ecourts" as const,
      confidence: 1,
      editable: false,
    },
    ...hearings.map((h) => ({
      date: h.hearingDate,
      title: h.purpose || "Hearing",
      description: h.result,
      source: "ecourts" as const,
      confidence: 1,
      editable: false,
    })),
    ...orders.map((o) => ({
      date: o.orderDate,
      title: o.orderType || "Order",
      description: o.summary,
      source: "ecourts" as const,
      confidence: 1,
      editable: false,
    })),
  ];

  const humanSummary =
    `This is a ${record.caseType} matter between ${record.petitioner} and ${record.respondent}, ` +
    `filed in ${record.courtName} on ${record.filingDate}. The case is currently ${record.caseStatus} and ` +
    (record.nextHearingDate
      ? `the next hearing is on ${record.nextHearingDate}.`
      : "there is no scheduled next hearing.");

  const currentStageExplanation =
    record.stage || "No stage information is available for this case.";

  const whatHappenedLast = last
    ? `On ${last.hearingDate}, the hearing for ${last.purpose || "the matter"} ended with: ${last.result}. ${last.orderSummary ?? ""}`
    : "No hearing history is available yet.";

  const whatToPrepare = [
    "Review the last order and note what the court asked for.",
    "Keep the documents already filed ready (pleadings, evidence).",
    "Prepare a short summary of your position before the next hearing.",
    "Confirm the next hearing date and court/bench with your advocate or the court.",
  ];

  return {
    humanSummary,
    timeline,
    currentStageExplanation,
    upcomingHearing: {
      date: record.nextHearingDate,
      note: record.nextHearingDate
        ? `Next hearing on ${record.nextHearingDate}. Confirm the bench and time with the court.`
        : "No upcoming hearing scheduled.",
    },
    whatHappenedLast,
    whatToPrepare,
    isDemo: caseData.isDemo,
  };
}
