/**
 * Missing-information detection.
 *
 * Compares the clauses actually found against a per-document-type checklist.
 * Items are labelled "commonly_expected" (a drafting-quality observation) or
 * "may_be_legally_required" (flagged only where a well-known statutory
 * requirement exists — and even then phrased as needing verification).
 */
import type { DocumentType, MissingItem } from "./types";

interface ChecklistItem {
  category: string;
  whyItMatters: string;
  expectation: MissingItem["expectation"];
  /** Also satisfied if the text mentions this anywhere, not just as a clause. */
  aliases?: RegExp[];
}

const SHARED: ChecklistItem[] = [
  {
    category: "Dispute Resolution",
    whyItMatters: "Without an agreed mechanism (arbitration/mediation/courts), disputes default to slower public litigation.",
    expectation: "commonly_expected",
    aliases: [/arbitration/i, /mediation/i, /dispute/i],
  },
  {
    category: "Jurisdiction / Governing Law",
    whyItMatters: "The document does not clearly specify which law applies or which courts have jurisdiction.",
    expectation: "commonly_expected",
    aliases: [/jurisdiction/i, /governing\s+law/i, /courts?\s+at/i],
  },
];

const CHECKLISTS: Partial<Record<DocumentType, ChecklistItem[]>> = {
  "Rental Agreement": [
    ...SHARED,
    { category: "Rent", whyItMatters: "The document does not clearly state the rent amount and due date.", expectation: "commonly_expected", aliases: [/\brent\b/i] },
    { category: "Security Deposit", whyItMatters: "Without deposit terms, refund disputes are hard to resolve.", expectation: "commonly_expected", aliases: [/deposit/i] },
    { category: "Security Deposit Refund Timeline", whyItMatters: "No timeline is stated for returning the deposit after vacating.", expectation: "commonly_expected", aliases: [/refund/i, /return\s+of\s+(?:the\s+)?deposit/i] },
    { category: "Termination", whyItMatters: "Exit conditions are undefined, making early departure uncertain.", expectation: "commonly_expected", aliases: [/terminat/i] },
    { category: "Notice Period", whyItMatters: "Without a notice period, either party may be considered in breach for leaving.", expectation: "commonly_expected", aliases: [/notice\s+period/i] },
    { category: "Maintenance", whyItMatters: "Responsibility for repairs and maintenance is not allocated.", expectation: "commonly_expected", aliases: [/maintenance/i, /repairs?/i] },
    { category: "Renewal", whyItMatters: "Renewal terms are unstated, so continuation depends on mutual goodwill.", expectation: "commonly_expected", aliases: [/renew/i] },
    { category: "Registration of the agreement", whyItMatters: "In several Indian states, lease agreements above a set duration/value must be registered — verify the requirement that applies to your state and duration.", expectation: "may_be_legally_required", aliases: [/registr/i, /stamp\s+duty/i] },
  ],
  "Employment Agreement": [
    ...SHARED,
    { category: "Remuneration", whyItMatters: "Compensation details are missing or unclear.", expectation: "commonly_expected", aliases: [/salary/i, /remuneration/i, /\bctc\b/i, /wages/i] },
    { category: "Notice Period", whyItMatters: "Without a notice period, resignation or dismissal terms are ambiguous.", expectation: "commonly_expected", aliases: [/notice\s+period/i] },
    { category: "Probation", whyItMatters: "Probation terms (duration, confirmation criteria) are not defined.", expectation: "commonly_expected", aliases: [/probation/i] },
    { category: "Working Hours", whyItMatters: "Expected working hours are not stated.", expectation: "commonly_expected", aliases: [/working\s+hours/i, /hours\s+of\s+work/i] },
    { category: "Leave Entitlement", whyItMatters: "Leave policy is not referenced.", expectation: "commonly_expected", aliases: [/leave\b/i, /holidays?/i] },
    { category: "Provident Fund / statutory benefits", whyItMatters: "Applicable statutory benefit deductions (e.g., PF) are not mentioned — verify which benefits apply to your employment.", expectation: "may_be_legally_required", aliases: [/provident\s+fund/i, /\bpf\b/i, /gratuity/i, /\besic?\b/i] },
  ],
  "Loan Agreement": [
    ...SHARED,
    { category: "Loan Amount", whyItMatters: "The principal amount is unclear.", expectation: "commonly_expected", aliases: [/principal/i, /loan\s+amount/i] },
    { category: "Interest Rate", whyItMatters: "The applicable interest rate is not stated.", expectation: "commonly_expected", aliases: [/interest/i] },
    { category: "Repayment Schedule", whyItMatters: "Repayment terms (tenure, EMIs) are missing.", expectation: "commonly_expected", aliases: [/repay/i, /\bemi\b/i, /instal?ment/i] },
    { category: "Default", whyItMatters: "Consequences of non-payment are not defined.", expectation: "commonly_expected", aliases: [/default/i] },
  ],
  "Non-Disclosure Agreement": [
    ...SHARED,
    { category: "Definition of Confidential Information", whyItMatters: "What counts as confidential is undefined, making the NDA unenforceable in practice.", expectation: "commonly_expected", aliases: [/confidential\s+information\s+means/i, /confidential/i] },
    { category: "Term", whyItMatters: "No duration for confidentiality obligations.", expectation: "commonly_expected", aliases: [/term\b/i, /shall\s+(?:remain\s+in|survive)/i] },
    { category: "Exclusions", whyItMatters: "Standard exclusions (public knowledge, independent development) are absent.", expectation: "commonly_expected", aliases: [/exclusion/i, /publicly\s+available/i] },
  ],
};

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  ...SHARED,
  { category: "Parties", whyItMatters: "All parties are not clearly identified with names and addresses.", expectation: "commonly_expected", aliases: [/party|parties|between/i] },
  { category: "Payment Terms", whyItMatters: "Amounts, currency and payment timelines are unclear.", expectation: "commonly_expected", aliases: [/payment/i, /amount/i, /\bfee\b/i] },
  { category: "Termination", whyItMatters: "How the agreement can be ended is not specified.", expectation: "commonly_expected", aliases: [/terminat/i] },
  {
    category: "Stamp duty / registration compliance",
    whyItMatters:
      "Many Indian instruments require stamp duty and, in some cases, registration to be admissible as evidence — consider verifying whether this document needs it.",
    expectation: "may_be_legally_required",
    aliases: [/stamp\s+duty/i, /registr/i],
  },
];

/**
 * Detect expected items that are absent both from clause titles and (via
 * aliases) from the full text. Always returns "missing_from_document" status
 * — legal-mandatory framing only appears on vetted checklist items.
 */
export function detectMissingInfo(
  docType: DocumentType,
  clauseTitles: string[],
  fullText: string,
  maxItems = 8
): MissingItem[] {
  const checklist =
    CHECKLISTS[docType] ??
    // Contract-ish types share the generic list; FIR/affidavit/RTI get none
    // beyond shared items since their structure differs fundamentally.
    (docType === "Contract" || docType === "Other / Unknown" || docType === "Terms & Conditions"
      ? DEFAULT_CHECKLIST
      : SHARED);

  const titles = clauseTitles.join(" \n ");
  const items: MissingItem[] = [];
  for (const entry of checklist) {
    const coveredByTitle = titles.toLowerCase().includes(entry.category.toLowerCase().split(/[ /(]/)[0]);
    const coveredByText = entry.aliases?.some((re) => re.test(fullText)) ?? false;
    if (coveredByTitle || coveredByText) continue;
    items.push({
      item: entry.category,
      whyItMatters: entry.whyItMatters,
      status: "missing_from_document",
      expectation: entry.expectation,
    });
    if (items.length >= maxItems) break;
  }
  return items;
}
