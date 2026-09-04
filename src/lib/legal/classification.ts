import "server-only";
import type { LegalCategory } from "@/lib/legal/schemas";

/* =========================================================================
 * Rule-based legal classification — the deterministic backbone of triage.
 * Used as a fallback when the LLM is unavailable and to cross-check.
 * ========================================================================= */

export interface CategoryRule {
  category: LegalCategory;
  subCategory: string;
  keywords: string[];
  followUpQuestions: string[];
  pathwayHints: string[];
}

export const CATEGORY_RULES: CategoryRule[] = [
  {
    category: "employment",
    subCategory: "unpaid_salary",
    keywords: [
      "salary", "wages", "wage", "pay", "unpaid", "pf", "provident",
      "terminated", "fired", "laid off", "notice period", "gratuity",
      "overtime", "employer", "appointment letter", "payslip", "salary slip",
    ],
    followUpQuestions: [
      "How many months of salary are unpaid, and which months?",
      "Do you have an appointment letter or employment contract?",
      "Is your employer a registered company or an individual?",
      "Have you sent a written demand to your employer yet?",
    ],
    pathwayHints: [
      "Payment of Wages Act",
      "Industrial Disputes Act / state Shops & Establishments Act",
      "Minimum Wages Act (if applicable)",
      "Legal notice followed by labour court / civil claim",
    ],
  },
  {
    category: "consumer",
    subCategory: "consumer_complaint",
    keywords: [
      "refund", "defective", "product", "service", "flights", "airline",
      "seller", "amazon", "flipkart", "delivery", "warranty", "guarantee",
      "paid for", "charge", "billing", "consumer", "booking",
    ],
    followUpQuestions: [
      "What did you buy or pay for, and how much?",
      "When did the problem happen?",
      "Have you raised a complaint with the seller/company?",
      "Do you have the invoice or payment record?",
    ],
    pathwayHints: [
      "Consumer Protection Act, 2019",
      "Consumer Commission (district / state / national)",
      "Online consumer dispute resolution",
    ],
  },
  {
    category: "property",
    subCategory: "security_deposit",
    keywords: [
      "landlord", "tenant", "deposit", "security deposit", "rent", "eviction",
      "property", "builder", "flat", "house", "broker", "agreement to sell",
      "registry", "sale deed", "possession", "plot", "encroachment",
      "lease", "lessee", "lessor", "evict", "tenancy", "tpa",
      "transfer of property", "section 106",
    ],
    followUpQuestions: [
      "Is this about rent/tenancy (deposit) or purchase of property?",
      "How much money is involved?",
      "Is there a written agreement?",
      "Have you sent a formal demand or notice?",
    ],
    pathwayHints: [
      "Rent / tenancy dispute → Rent Control Act or civil suit",
      "Property purchase → specific performance / refund before consumer forum or civil court",
      "Legal notice → demand → suit or consumer complaint",
    ],
  },
  {
    category: "criminal",
    subCategory: "criminal_matter",
    keywords: [
      "police", "fir", "arrest", "threat", "assault", "cheated", "stolen",
      "harassed", "stalked", "abused", "marital", "dowry", "custody",
      "bail", "accused", "crime",
    ],
    followUpQuestions: [
      "Are you a victim, witness, or accused?",
      "Is there an FIR number? If yes, what is it?",
      "Are you in any immediate danger right now?",
      "Have you spoken with the police already?",
    ],
    pathwayHints: [
      "FIR / police complaint",
      "Interim protection orders where applicable",
      "Legal aid through DLSA (free in many cases)",
    ],
  },
  {
    category: "cyber",
    subCategory: "online_fraud",
    keywords: [
      "scam", "fraud", "hacked", "otp", "phishing", "upi", "bank account",
      "money deducted", "fake", "crypto", "bitcoin", "investment scheme",
      "loan app", "credit card", "debit card", "online",
    ],
    followUpQuestions: [
      "How was the money taken (UPI, card, bank transfer)?",
      "How much was lost and when?",
      "Have you reported it to your bank / the cyber cell yet?",
      "Do you have transaction or message records?",
    ],
    pathwayHints: [
      "Report to bank immediately (dispute/chargeback)",
      "National Cyber Crime Reporting Portal (1930)",
      "Police FIR",
    ],
  },
  {
    category: "family",
    subCategory: "family_matter",
    keywords: [
      "divorce", "maintenance", "alimony", "child custody", "guardianship",
      "husband", "wife", "in-laws", "marriage", "domestic", "498a", "dowry",
      "adoption", "succession",
    ],
    followUpQuestions: [
      "What kind of family matter is this (marriage, maintenance, custody)?",
      "Are there children involved?",
      "Is there any immediate safety concern?",
      "Has any legal proceeding already started?",
    ],
    pathwayHints: [
      "Family court matters",
      "Maintenance under CrPC/BNSS or personal law",
      "Domestic violence → Protection of Women from Domestic Violence Act",
    ],
  },
  {
    category: "civil",
    subCategory: "civil_dispute",
    keywords: [
      "contract", "money owed", "loan", "cheque bounced", "cheque", "debt",
      "notice", "suit", "damages", "defamation", "breach", "recovery",
      "interest", "arrears",
    ],
    followUpQuestions: [
      "How much money is involved?",
      "Is there a written agreement or record?",
      "When did the amount become due?",
      "Has a legal notice already been sent?",
    ],
    pathwayHints: [
      "Civil suit for recovery",
      "Negotiable Instruments Act (cheque bounce) → criminal + civil",
      "Legal notice as first step",
    ],
  },
  {
    category: "commercial",
    subCategory: "commercial_dispute",
    keywords: [
      "business", "company", "partnership", "invoice unpaid", "vendor",
      "supplier", "trademark", "copyright", "breach of contract", "llc",
      "gst", "agreement between companies",
      // Unambiguous B2B signals. Deliberately excludes "nda" and
      // "non-compete": a question about whether such a clause binds someone is
      // usually a legal question, not a commercial-court dispute.
      "arbitration", "arbitration clause", "purchase order", "supply agreement",
      "msme",
    ],
    followUpQuestions: [
      "Is this between two businesses or you and a business?",
      "What does the contract say about disputes?",
      "What amount is at stake?",
      "Is there an arbitration clause?",
    ],
    pathwayHints: [
      "Arbitration / commercial court",
      "Civil suit for recovery",
      "Arbitration and Conciliation Act, 1996",
    ],
  },
  {
    category: "constitutional",
    subCategory: "rights_matter",
    keywords: [
      "fundamental rights", "writ", "supreme court", "high court", "habeas",
      "right to", "discriminated", "caste", "government refused",
    ],
    followUpQuestions: [
      "Which government action or refusal is involved?",
      "Which state or authority took the action?",
      "Have you made a representation to the authority?",
    ],
    pathwayHints: [
      "Writ petition before High Court / Supreme Court",
      "Public Interest Litigation where applicable",
      "RTI for records first if relevant",
    ],
  },
];

const CATEGORY_FALLBACK: LegalCategory = "other";

/** A classification decision, with the evidence that produced it. */
export interface CategoryMatch extends CategoryRule {
  /** Distinct keywords that matched, most specific first. */
  matchedKeywords: string[];
  /** Accumulated specificity score for the winning category. */
  score: number;
  /**
   * True when the keyword evidence is decisive — a multi-word legal phrase
   * matched, or several distinct keywords agreed, and the runner-up category is
   * clearly behind. Callers use this to decide whether an LLM may overrule the
   * deterministic verdict.
   */
  strong: boolean;
}

/**
 * Specificity weight for a keyword. Short keywords ("fir", "pay", "tpa") are
 * ambiguous and must not outweigh a precise multi-word phrase; a single
 * incidental long word must not decide the category on its own either. This
 * replaces an earlier "highest single keyword wins" rule under which the word
 * "registered" in the criminal list classified *any* registered lease question
 * as a criminal matter.
 */
function keywordWeight(keyword: string): number {
  if (keyword.includes(" ")) return 3;
  if (keyword.length >= 9) return 2;
  if (keyword.length >= 5) return 1;
  return 0.5;
}

const WORD_CHARS = /[a-z0-9]/i;

/** Escape a keyword for use inside a RegExp. */
function escapeRe(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Whole-word keyword test with light inflection tolerance, so "lease" matches
 * "leases" but never "released", and "fir" never matches "confirmed" or
 * "first". Substring matching was a standing source of misclassification.
 */
function matchesKeyword(haystack: string, keyword: string): boolean {
  const kw = keyword.toLowerCase();
  const lead = WORD_CHARS.test(kw[0]) ? "\\b" : "";
  const tail = WORD_CHARS.test(kw[kw.length - 1]) ? "(?:s|es|ed|ing)?\\b" : "";
  return new RegExp(`${lead}${escapeRe(kw)}${tail}`, "i").test(haystack);
}

/**
 * Deterministic keyword classifier. Scores every category by summing the
 * specificity of all its matching keywords, then returns the leader — so
 * agreement between several keywords beats one incidental hit.
 */
export function classifyByKeywords(input: string): CategoryMatch {
  const text = input.toLowerCase().replace(/\s+/g, " ");

  const scored = CATEGORY_RULES.map((rule) => {
    const matchedKeywords = rule.keywords
      .filter((k) => matchesKeyword(text, k))
      .sort((a, b) => keywordWeight(b) - keywordWeight(a) || b.length - a.length);
    const score = matchedKeywords.reduce((n, k) => n + keywordWeight(k), 0);
    return { rule, matchedKeywords, score };
  })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);

  const winner = scored[0];
  if (!winner) {
    // No keyword evidence at all. A bare legal question ("is a non-compete
    // enforceable in India?") is common and deserves research pathways rather
    // than the grievance-intake questions the categories above assume.
    const isQuestion =
      text.trim().endsWith("?") ||
      /^(is|are|can|does|do|what|which|how|when|whether|should|must)\b/.test(text.trim());
    return {
      category: CATEGORY_FALLBACK,
      subCategory: isQuestion ? "legal_question" : "general",
      keywords: [],
      followUpQuestions: isQuestion
        ? [
            "Which state or jurisdiction does this concern?",
            "Is this about an agreement you have already signed, or one being negotiated?",
            "Is there a specific clause, notice, or section you want examined?",
            "Is any deadline or hearing date attached to this?",
          ]
        : [
            "Can you tell me a little more about what happened?",
            "When did this happen, and where?",
            "How much money or value is involved, if any?",
            "Do you have any documents or evidence with you?",
          ],
      pathwayHints: isQuestion
        ? [
            "Identify the governing statute and the section that applies",
            "Check how courts have read that section in comparable facts",
            "Confirm the position with a qualified advocate before relying on it",
          ]
        : [],
      matchedKeywords: [],
      score: 0,
      strong: false,
    };
  }

  const runnerUp = scored[1]?.score ?? 0;
  return {
    ...winner.rule,
    matchedKeywords: winner.matchedKeywords,
    score: winner.score,
    strong: winner.score >= 3 && winner.score - runnerUp >= 1.5,
  };
}

export const CATEGORY_LABELS: Record<LegalCategory, string> = {
  employment: "Employment & workplace",
  civil: "Civil dispute",
  criminal: "Criminal matter",
  consumer: "Consumer",
  property: "Property & tenancy",
  family: "Family",
  cyber: "Cyber / online fraud",
  commercial: "Commercial",
  constitutional: "Constitutional / rights",
  other: "Other",
};
