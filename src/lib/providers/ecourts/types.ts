/* =========================================================================
 * eCourts (eCourtsIndia API) types — shaped from verified live responses.
 *
 * Base URL: https://webapi.ecourtsindia.com
 * Auth:     Authorization: Bearer eci_live_<token>
 * Envelope: { data: ..., meta: { request_id } }
 * ========================================================================= */

export interface ECourtCaseRecord {
  cnr: string;
  courtName: string;
  courtCode: string;
  caseNumber: string;
  caseType: string;
  caseTypeRaw: string;
  caseCategory: string;
  caseStatus: "pending" | "disposed" | "unknown";
  petitioner: string;
  respondent: string;
  filingDate: string;
  firstHearingDate: string | null;
  decisionDate: string | null;
  judge: string;
  stage: string;
  nextHearingDate: string | null;
}

export interface ECourtHearing {
  hearingDate: string;
  purpose: string;
  result: string;
  orderSummary: string;
}

export interface ECourtOrder {
  orderDate: string;
  orderType: string;
  summary: string;
  url?: string;
}

export interface ECourtCaseDetail {
  record: ECourtCaseRecord;
  history: ECourtHearing[];
  orders: ECourtOrder[];
  isDemo: boolean;
  parties?: {
    petitioners: string[];
    respondents: string[];
  };
  advocates?: {
    petitioners: string[];
    respondents: string[];
  };
  judges?: string[];
  orderCount: number;
}

export interface ECourtProviderHealth {
  ok: boolean;
  mode: "live" | "mock" | "unconfigured";
  checkedAt: string;
}

export interface ECourtSearchResult {
  cnr: string;
  caseType: string;
  caseStatus: string;
  courtName: string;
  filingDate: string;
  registrationNumber: string;
  nextHearingDate: string | null;
  decisionDate: string | null;
  petitioners: string[];
  respondents: string[];
  judges: string[];
}

export interface ECourtSearchResponse {
  results: ECourtSearchResult[];
  totalHits: number;
  page: number;
  hasNextPage: boolean;
}
