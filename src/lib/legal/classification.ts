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

const ALL_KEYWORDS = CATEGORY_RULES.flatMap((r) =>
  r.keywords.map((k) => ({ keyword: k, rule: r }))
);

/** Deterministic keyword classifier. */
export function classifyByKeywords(input: string): CategoryRule {
  const text = input.toLowerCase();
  let best: CategoryRule | null = null;
  let bestScore = 0;
  for (const { keyword, rule } of ALL_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      let score = 1;
      if (keyword.length > 8) score += 1; // longer keywords are more specific
      if (rule.category !== "other") score += 0.5;
      if (score > bestScore) {
        bestScore = score;
        best = rule;
      }
    }
  }
  return (
    best ?? {
      category: CATEGORY_FALLBACK,
      subCategory: "general",
      keywords: [],
      followUpQuestions: [
        "Can you tell me a little more about what happened?",
        "When did this happen, and where?",
        "How much money or value is involved, if any?",
        "Do you have any documents or evidence with you?",
      ],
      pathwayHints: [],
    }
  );
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
