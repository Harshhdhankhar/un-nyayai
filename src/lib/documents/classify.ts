/**
 * Deterministic document classification.
 *
 * Scores each candidate type by weighted keyword/phrase hits in the text and
 * returns the best match. Confidence reflects signal strength — low-signal
 * documents classify as "Other / Unknown" instead of a false claim.
 */
import type { Classification, DocumentType } from "./types";
import { DOCUMENT_TYPES } from "./types";

interface TypeSignal {
  type: DocumentType;
  /** Strong phrases — each hit counts heavily. */
  strong: RegExp[];
  /** Supporting words — each distinct hit adds a little. */
  weak: RegExp[];
}

const SIGNALS: TypeSignal[] = [
  {
    type: "Rental Agreement",
    strong: [/\brent(al)?\s+agreement\b/i, /\blease\s+(agreement|deed)\b/i, /\btenancy\s+agreement\b/i, /\bleave\s+and\s+licen[cs]e\s+agreement\b/i],
    weak: [/\btenant\b/i, /\blandlord\b/i, /\blessor\b/i, /\blessee\b/i, /\bsecurity\s+deposit\b/i, /\bmonthly\s+rent\b/i, /\bmaintenance\s+charg/i, /\bsub-?lett?ing\b/i],
  },
  {
    type: "Employment Agreement",
    strong: [/\bemployment\s+(agreement|contract)\b/i, /\boffer\s+of\s+employment\b/i, /\bappointment\s+letter\b/i, /\bemployee\s+handbook\b/i, /\bservice\s+agreement\b(?=.*employ)/i],
    weak: [/\bemployer\b/i, /\bemployee\b/i, /\bsalary\b/i, /\bprobation(ary)?\b/i, /\bnotice\s+period\b/i, /\bctc\b/i, /\bleave\s+entitlement\b/i, /\bresignation\b/i],
  },
  {
    type: "Sale Agreement",
    strong: [/\bagreement\s+to\s+sell\b/i, /\bsale\s+(agreement|deed)\b/i, /\bpurchase\s+agreement\b/i, /\bconveyance\s+deed\b/i],
    weak: [/\bseller\b/i, /\bpurchaser?\b/i, /\bbuyer\b/i, /\bstamp\s+duty\b/i, /\bregistration\s+fee\b/i, /\bpossession\s+date\b/i, /\btoken\s+amount\b/i, /\bproperty\b/i],
  },
  {
    type: "Non-Disclosure Agreement",
    strong: [/\bnon-?disclosure\s+agreement\b/i, /\bNDA\b/, /\bconfidentiality\s+agreement\b/i, /\bmutual\s+disclosure\b/i],
    weak: [/\bconfidential\s+information\b/i, /\bdisclosing\s+party\b/i, /\breceiving\s+party\b/i, /\btrade\s+secret/i, /\bnon-?solicit/i],
  },
  {
    type: "Legal Notice",
    strong: [/\blegal\s+notice\b/i, /\bnotice\s+under\s+(?:section\s+)?\d+/i, /\btake\s+notice\s+that\b/i],
    weak: [/\badvocate\b/i, /\bwhereas\s+my\s+client\b/i, /\bcause\s+of\s+action\b/i, /\bwithin\s+\d+\s+days\b/i, /\bfail(?:ure|ing)\s+which\b/i, /\bcivil\s+and\s+criminal\s+proceedings\b/i],
  },
  {
    type: "Affidavit",
    strong: [/\baffidavit\b/i, /\bdo\s+hereby\s+(?:solemnly\s+)?(?:affirm|declare)\b/i, /\bsolemnly\s+affirm\b/i],
    weak: [/\bdeponent\b/i, /\boath\b/i, /\bnotary\b/i, /\battested\b/i, /\bverify\s+at\b/i],
  },
  {
    type: "FIR",
    strong: [/\bfirst\s+information\s+report\b/i, /\bFIR\b/, /\be-?FIR\b/],
    weak: [/\bcomplainant\b/i, /\binformant\b/i, /\bpolice\s+station\b/i, /\bsections?\s+of\s+law\b/i, /\boccurrence\s+of\s+offence\b/i],
  },
  {
    type: "RTI Document",
    strong: [/\bright\s+to\s+information\b/i, /\bRTI\s+(application|request|first\s+appeal)\b/i, /\bunder\s+(?:section\s+)?6\s*\(1\)\s+of\s+the\s+RTI/i, /\bpublic\s+information\s+officer\b/i],
    weak: [/\bPIO\b/, /\bCPIO\b/, /\binformation\s+sought\b/i, /\bapplication\s+fee\b/i, /\bthirty\s+days\b/i, /\bfirst\s+appeal\b/i],
  },
  {
    type: "Terms & Conditions",
    strong: [/\bterms\s+(?:and|&)\s+conditions\b/i, /\bterms\s+of\s+(?:use|service)\b/i, /\buser\s+agreement\b/i, /\bprivacy\s+policy\b/i],
    weak: [/\bplatform\b/i, /\bwebsite\b/i, /\buser[s]?\b/i, /\baccount\b/i, /\bsubscription\b/i, /\bcookie/i],
  },
  {
    type: "Loan Agreement",
    strong: [/\bloan\s+agreement\b/i, /\bcredit\s+facility\s+agreement\b/i, /\bloan\s+sanction\s+letter\b/i, /\bterm\s+loan\b/i],
    weak: [/\blender\b/i, /\bborrower\b/i, /\bprincipal\s+amount\b/i, /\binterest\s+rate\b/i, /\bEMI\b/, /\bmoratorium\b/i, /\bdefault\b/i, /\bcollateral\b/i],
  },
  {
    type: "Partnership Agreement",
    strong: [/\bpartnership\s+(deed|agreement)\b/i],
    weak: [/\bpartner[s]?\b/i, /\bprofit[- ]sharing\b/i, /\bcapital\s+contribution\b/i, /\bfirm\s+name\b/i, /\bdissolution\b/i],
  },
  {
    type: "Contract",
    strong: [/\bthis\s+agreement\b/i, /\bmutually\s+agreed\b/i, /\bwitnesseth\b/i, /\bparties\s+hereto\b/i],
    weak: [/\bvendors?\b/i, /\bservice\s+provider\b/i, /\bdeliverables?\b/i, /\bconsideration\b/i, /\bindemnif/i, /\btermination\b/i, /\bforce\s+majeure\b/i, /\barbitration\b/i, /\bgoverning\s+law\b/i],
  },
];

const MIN_STRONG_FOR_CONFIDENT = 1;
const MIN_SCORE_FOR_TYPE = 3;

/**
 * Classify raw document text. Returns "Other / Unknown" with low confidence
 * when no type has enough signal — never a false specific claim.
 */
export function classifyDocument(text: string): Classification {
  const head = text.slice(0, 12_000);
  const scores = SIGNALS.map((signal) => {
    let score = 0;
    for (const re of signal.strong) {
      if (re.test(head)) score += 4;
    }
    for (const re of signal.weak) {
      if (re.test(head)) score += 1;
    }
    return { type: signal.type, score };
  }).sort((a, b) => b.score - a.score);

  const best = scores[0];
  const second = scores[1];
  if (!best || best.score < MIN_SCORE_FOR_TYPE) {
    return { name: "Other / Unknown", confidence: 0.2 };
  }

  // Confidence grows with absolute score and separation from runner-up.
  const separation = best.score - (second?.score ?? 0);
  let confidence = Math.min(0.95, 0.45 + best.score * 0.05 + separation * 0.04);
  if (best.score >= 4 + MIN_STRONG_FOR_CONFIDENT * 3) confidence = Math.min(0.95, confidence + 0.05);
  return { name: best.type, confidence: Number(confidence.toFixed(2)) };
}

/** Canonical clause categories expected in each document type. */
export function expectedClausesFor(type: DocumentType): string[] {
  switch (type) {
    case "Rental Agreement":
      return [
        "Rent", "Security Deposit", "Termination", "Notice Period",
        "Maintenance", "Rent Escalation", "Subletting", "Lock-in Period",
        "Renewal", "Dispute Resolution", "Jurisdiction",
      ];
    case "Employment Agreement":
      return [
        "Remuneration", "Probation", "Notice Period", "Termination",
        "Confidentiality", "Non-Compete", "Working Hours", "Leave Entitlement",
        "Intellectual Property", "Dispute Resolution",
      ];
    case "Non-Disclosure Agreement":
      return [
        "Definition of Confidential Information", "Obligations", "Term",
        "Exclusions", "Return of Materials", "Remedies", "Jurisdiction", "Term",
      ];
    case "Loan Agreement":
      return [
        "Loan Amount", "Interest Rate", "Repayment Schedule", "Default",
        "Prepayment", "Security/Collateral", "Events of Default", "Jurisdiction",
      ];
    case "Sale Agreement":
      return [
        "Property Description", "Sale Consideration", "Payment Schedule",
        "Possession", "Title Warranties", "Default", "Jurisdiction",
      ];
    case "Legal Notice":
      return ["Facts", "Allegations", "Demands/Relief Sought", "Reply Deadline"];
    case "Partnership Agreement":
      return [
        "Capital Contribution", "Profit Sharing", "Duties of Partners",
        "Admission of Partners", "Dissolution", "Dispute Resolution",
      ];
    default:
      return [
        "Parties", "Scope/Purpose", "Payment Terms", "Termination",
        "Liability", "Dispute Resolution", "Governing Law/Jurisdiction",
      ];
  }
}

/** Ensure an arbitrary LLM-proposed type is one we advertise. */
export function normalizeDocumentType(name: string): DocumentType {
  const found = DOCUMENT_TYPES.find((t) => t.toLowerCase() === name.trim().toLowerCase());
  return found ?? (DOCUMENT_TYPES.includes(name.trim() as DocumentType) ? (name.trim() as DocumentType) : "Other / Unknown");
}
