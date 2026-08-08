import "server-only";
import type { ECourtCaseDetail } from "./types";

/* =========================================================================
 * DEMO eCourts case data. Clearly labelled so it is never mistaken for real
 * case information. Used when no live API access is available.
 * ========================================================================= */

const DEMO_CNR_PREFIXES = ["DL", "MH", "KA", "TN", "GJ"];

export function isDemoCnr(cnr: string): boolean {
  const upper = cnr.toUpperCase();
  return DEMO_CNR_PREFIXES.some((p) => upper.startsWith(p));
}

function makeDemoCnr(cnr: string): ECourtCaseDetail {
  const suffix = cnr.toUpperCase();
  return {
    record: {
      cnr: suffix,
      courtName: "District & Sessions Court, Tis Hazari",
      courtCode: "DL00001",
      caseNumber: "CS/452/2023",
      caseType: "Civil Suit (Recovery)",
      caseTypeRaw: "Civil Suit",
      caseCategory: "Civil",
      caseStatus: "pending",
      petitioner: "Ravi Kumar (DEMO)",
      respondent: "ABC Traders Pvt Ltd (DEMO)",
      filingDate: "2023-09-14",
      firstHearingDate: "2023-10-20",
      decisionDate: null,
      judge: "Sh. A. Sharma (DEMO)",
      stage: "Written Statement awaited",
      nextHearingDate: "2026-08-24",
    },
    history: [
      {
        hearingDate: "2023-09-14",
        purpose: "Filing",
        result: "Registered",
        orderSummary: "Case registered and numbered.",
      },
      {
        hearingDate: "2023-10-20",
        purpose: "First hearing",
        result: "Summons issued",
        orderSummary: "Summons issued to the defendant returnable on next date.",
      },
      {
        hearingDate: "2026-08-24",
        purpose: "Written statement",
        result: "Pending",
        orderSummary: "DEMO: next hearing scheduled for written statement.",
      },
    ],
    orders: [
      {
        orderDate: "2023-10-20",
        orderType: "Summons",
        summary: "Summons issued to the defendant (DEMO).",
      },
    ],
    isDemo: true,
    orderCount: 1,
  };
}

export function mockLookupByCnr(cnr: string): ECourtCaseDetail {
  return makeDemoCnr(cnr);
}
