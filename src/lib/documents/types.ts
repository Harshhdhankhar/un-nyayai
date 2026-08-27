/**
 * Shared structured-analysis types for the Legal Document Analyzer.
 * Everything here is plain data so both the pipeline and the tests can use it.
 */

export const DOCUMENT_TYPES = [
  "Rental Agreement",
  "Employment Agreement",
  "Sale Agreement",
  "Non-Disclosure Agreement",
  "Legal Notice",
  "Affidavit",
  "Contract",
  "FIR",
  "RTI Document",
  "Terms & Conditions",
  "Loan Agreement",
  "Partnership Agreement",
  "Other / Unknown",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export interface Classification {
  name: DocumentType;
  confidence: number;
}

export interface OverviewFact {
  label: string;
  value: string;
  page: number | null;
}

export interface DocumentOverview {
  parties: OverviewFact[];
  importantDates: OverviewFact[];
  amounts: OverviewFact[];
  duration: string | null;
  obligations: string[];
  deadlines: OverviewFact[];
  jurisdiction: string | null;
  keyTerms: string[];
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ExtractedClause {
  title: string;
  text: string;
  page: number | null;
  /** Canonical category from the taxonomy, when recognized. */
  category: string | null;
}

export interface AnalyzedClause extends ExtractedClause {
  summary: string;
  riskLevel: RiskLevel;
}

export interface RiskFinding {
  clauseTitle: string;
  clauseExcerpt: string;
  page: number | null;
  level: RiskLevel;
  whatItSays: string;
  whyItMatters: string;
  favors: string;
  consequence: string;
  suggestedAction: string;
  source: "rule" | "ai";
}

export interface MissingItem {
  item: string;
  whyItMatters: string;
  status: "missing_from_document";
  expectation: "commonly_expected" | "may_be_legally_required";
}

export interface PiiReportItem {
  entity: string;
  text: string;
  confidence: number;
  page: number | null;
}

/** The full structured report stored in document_analyses.result. */
export interface AnalysisResult {
  documentType: Classification;
  summary: string;
  overview: DocumentOverview;
  clauses: AnalyzedClause[];
  risks: RiskFinding[];
  missingInformation: MissingItem[];
  pii: {
    engine: "presidio" | "regex";
    count: number;
    items: PiiReportItem[];
  };
  citations: { label: string; page: number | null }[];
  meta: {
    aiUsed: boolean;
    analyzedAt: string;
    disclaimer: string;
  };
}

export const ANALYSIS_DISCLAIMER =
  "NyayAI provides informational assistance and document analysis. It does not replace professional legal advice.";
