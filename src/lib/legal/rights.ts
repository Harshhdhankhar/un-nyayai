import "server-only";
import { CATEGORY_LABELS, classifyByKeywords } from "@/lib/legal/classification";
import { hybridRetrieve } from "@/lib/retrieval/hybrid";
import { legalAidServices } from "@/lib/db/schema";
import { db } from "@/lib/db/client";

/* =========================================================================
 * Rights Engine — maps a life situation to possible rights, remedies,
 * required facts, official sources and next steps. Never guarantees
 * outcomes; always points to official channels.
 * ========================================================================= */

export interface RightsResult {
  category: string;
  categoryLabel: string;
  situation: string;
  possibleRights: string[];
  possibleRemedies: string[];
  requiredFacts: string[];
  officialSources: { title: string; url: string }[];
  nextSteps: string[];
  legalAidOptions: string[];
  disclaimer: string;
}

const RIGHTS_MAP: Record<string, Omit<RightsResult, "category" | "categoryLabel" | "situation" | "legalAidOptions" | "disclaimer">> = {
  employment: {
    possibleRights: [
      "Right to timely payment of wages for work done",
      "Right against unlawful deduction of wages",
    ],
    possibleRemedies: [
      "Claim before the labour authority / labour court",
      "Legal notice and civil claim for recovery",
    ],
    requiredFacts: [
      "Employment proof (appointment letter / contract)",
      "Salary slips and bank statements",
      "Period of non-payment",
      "Employer's registered name/entity",
    ],
    officialSources: [
      { title: "Payment of Wages Act, 1936", url: "https://www.indiacode.nic.in/handle/123456789/2391" },
      { title: "Minimum Wages Act, 1948", url: "https://www.indiacode.nic.in/handle/123456789/2335" },
    ],
    nextSteps: [
      "Collect employment records",
      "Send a written demand",
      "Approach the labour officer/court",
    ],
  },
  consumer: {
    possibleRights: [
      "Right against unfair trade practice",
      "Right to be informed and to redressal for deficiency in service",
    ],
    possibleRemedies: [
      "Complaint before District/State/National Consumer Commission",
      "Mediation through online consumer dispute resolution",
    ],
    requiredFacts: [
      "Invoice / payment proof",
      "Description of defect or deficiency",
      "Communication with the seller",
    ],
    officialSources: [
      { title: "Consumer Protection Act, 2019", url: "https://www.indiacode.nic.in/handle/123456789/15445" },
    ],
    nextSteps: [
      "Complain to the seller with records",
      "File before the Consumer Commission (value-based jurisdiction)",
    ],
  },
  property: {
    possibleRights: [
      "Right to return of security deposit after tenancy ends (as per agreement/law)",
      "Right to specific performance or refund for sale disputes",
    ],
    possibleRemedies: [
      "Legal notice → civil suit / consumer complaint",
      "Rent control / tenancy authority (state-specific)",
    ],
    requiredFacts: [
      "Rent agreement / sale agreement",
      "Deposit receipt / payment proof",
      "Condition of premises at handover",
    ],
    officialSources: [
      { title: "State Rent Control Acts", url: "https://www.indiacode.nic.in" },
    ],
    nextSteps: [
      "Collect documents",
      "Send a written demand",
      "Choose a forum (civil / consumer / rent authority)",
    ],
  },
  criminal: {
    possibleRights: [
      "Right to report an offence and have an FIR recorded",
      "Right to legal representation (including free legal aid)",
    ],
    possibleRemedies: [
      "Police complaint / FIR",
      "Criminal prosecution before the trial court",
    ],
    requiredFacts: [
      "What happened, when and where",
      "Any FIR/complaint number",
      "Injuries/loss and evidence",
    ],
    officialSources: [
      { title: "Bharatiya Nagarik Suraksha Sanhita, 2023 (procedure)", url: "https://www.indiacode.nic.in/handle/123456789/25989" },
      { title: "NALSA", url: "https://nalsa.gov.in" },
    ],
    nextSteps: [
      "If in immediate danger, contact police / emergency services",
      "Record the complaint and obtain a reference number",
    ],
  },
  cyber: {
    possibleRights: [
      "Right to report cyber fraud through official channels",
      "Right to dispute unauthorised transactions with your bank",
    ],
    possibleRemedies: [
      "Bank dispute / chargeback",
      "Cyber crime complaint (1930 / cybercrime.gov.in)",
      "FIR",
    ],
    requiredFacts: [
      "Transaction/message records",
      "Timeline of the fraud",
      "Platform and amount involved",
    ],
    officialSources: [
      { title: "National Cyber Crime Reporting Portal", url: "https://cybercrime.gov.in" },
    ],
    nextSteps: [
      "Freeze/dispute with your bank immediately",
      "Report on the cyber portal and keep the reference",
    ],
  },
  family: {
    possibleRights: [
      "Rights in marriage, maintenance, custody as per applicable law",
      "Protection from domestic violence (where applicable)",
    ],
    possibleRemedies: [
      "Family court proceedings",
      "Protection orders under the DV Act",
    ],
    requiredFacts: [
      "Relationship details and events",
      "Any children involved",
      "Any existing proceedings",
    ],
    officialSources: [
      { title: "Protection of Women from Domestic Violence Act, 2005", url: "https://www.indiacode.nic.in/handle/123456789/1602" },
    ],
    nextSteps: [
      "If in danger, seek immediate help",
      "Gather records and consult a family law professional",
    ],
  },
  civil: {
    possibleRights: [
      "Right to recover money owed under a contract",
      "Right to enforce agreements through the courts",
    ],
    possibleRemedies: [
      "Legal notice → civil suit for recovery",
      "Negotiable Instruments Act proceedings for cheque dishonour",
    ],
    requiredFacts: [
      "Written agreement / records",
      "Dates and amounts due",
      "Proof of demand",
    ],
    officialSources: [
      { title: "Negotiable Instruments Act, 1881", url: "https://www.indiacode.nic.in/handle/123456789/2343" },
      { title: "Limitation Act, 1963", url: "https://www.indiacode.nic.in/handle/123456789/2262" },
    ],
    nextSteps: [
      "Send a written demand",
      "Check limitation period",
      "Consider filing suit",
    ],
  },
  constitutional: {
    possibleRights: [
      "Fundamental rights guaranteed by the Constitution",
      "Right to information (RTI) for public records",
    ],
    possibleRemedies: [
      "Writ petition before High Court / Supreme Court",
      "RTI application",
    ],
    requiredFacts: [
      "Which authority/action is involved",
      "Representation made and response",
      "Relevant records",
    ],
    officialSources: [
      { title: "Right to Information Act, 2005", url: "https://www.indiacode.nic.in/handle/123456789/2072" },
    ],
    nextSteps: [
      "Gather the relevant records",
      "File an RTI if records are needed",
      "Consider a writ petition with professional help",
    ],
  },
};

export async function getRightsForSituation(situation: string): Promise<RightsResult> {
  const rule = classifyByKeywords(situation);
  const base = RIGHTS_MAP[rule.category] ?? {
    possibleRights: [
      "You may have legal rights — but more information is needed to identify them.",
    ],
    possibleRemedies: [],
    requiredFacts: [
      "What happened, when and where",
      "Who is involved",
      "Any documents or evidence",
    ],
    officialSources: [],
    nextSteps: ["Describe your situation to get a more specific path."],
  };

  // Supplement with verified sections from the knowledge base.
  const hits = await hybridRetrieve(situation, { k: 3 });
  const officialSources = [
    ...base.officialSources,
    ...hits.map((h) => ({
      title: `${h.actName} — Section ${h.sectionNumber}`,
      url: h.sourceUrl ?? "https://www.indiacode.nic.in",
    })),
  ].slice(0, 5);

  const aid = await db
    .select({ name: legalAidServices.name })
    .from(legalAidServices)
    .limit(3);
  const legalAidOptions = aid.map((a) => a.name);

  return {
    category: rule.category,
    categoryLabel: CATEGORY_LABELS[rule.category],
    situation,
    possibleRights: base.possibleRights,
    possibleRemedies: base.possibleRemedies,
    requiredFacts: base.requiredFacts,
    officialSources,
    nextSteps: base.nextSteps,
    legalAidOptions,
    disclaimer:
      "This is general guidance, not legal advice. Outcomes are never guaranteed. Confirm eligibility with the relevant authority.",
  };
}
