import "dotenv/config";
import { eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { embed } from "@/lib/embedding";
import {
  users,
  profiles,
  statutes,
  sections,
  lawMappings,
  legalRoutes,
  routeSteps,
  deadlineRules,
  legalAidServices,
  knowledgeNodes,
  knowledgeEdges,
  judgments,
  legalSources,
} from "@/lib/db/schema";
import { hashPassword } from "@/lib/security";
import { logger } from "@/lib/logger";

/* =========================================================================
 * Seed data for NyayAI.
 * Statutes, sections, mappings and routes are verified-demo material —
 * they point at official sources but should be treated as sample data for a
 * hackathon build, not as a complete legal database.
 * ========================================================================= */

const STATUTES = [
  { actName: "Indian Penal Code, 1860", shortTitle: "IPC", category: "criminal", isRepealed: true, repealedByAct: "Bharatiya Nyaya Sanhita, 2023", effectiveDate: "1862-01-01", sourceUrl: "https://www.indiacode.nic.in/handle/123456789/2263" },
  { actName: "Bharatiya Nyaya Sanhita, 2023", shortTitle: "BNS", category: "criminal", isRepealed: false, effectiveDate: "2024-07-01", sourceUrl: "https://www.indiacode.nic.in/handle/123456789/25991" },
  { actName: "Code of Criminal Procedure, 1973", shortTitle: "CrPC", category: "procedure", isRepealed: true, repealedByAct: "Bharatiya Nagarik Suraksha Sanhita, 2023", effectiveDate: "1974-04-01", sourceUrl: "https://www.indiacode.nic.in/handle/123456789/2261" },
  { actName: "Bharatiya Nagarik Suraksha Sanhita, 2023", shortTitle: "BNSS", category: "procedure", isRepealed: false, effectiveDate: "2024-07-01", sourceUrl: "https://www.indiacode.nic.in/handle/123456789/25989" },
  { actName: "Indian Evidence Act, 1872", shortTitle: "Evidence Act", category: "procedure", isRepealed: true, repealedByAct: "Bharatiya Sakshya Adhiniyam, 2023", effectiveDate: "1872-09-01", sourceUrl: "https://www.indiacode.nic.in/handle/123456789/2182" },
  { actName: "Bharatiya Sakshya Adhiniyam, 2023", shortTitle: "BSA", category: "procedure", isRepealed: false, effectiveDate: "2024-07-01", sourceUrl: "https://www.indiacode.nic.in/handle/123456789/25990" },
  { actName: "Consumer Protection Act, 2019", shortTitle: "CPA", category: "consumer", isRepealed: false, effectiveDate: "2020-07-20", sourceUrl: "https://www.indiacode.nic.in/handle/123456789/15445" },
  { actName: "Payment of Wages Act, 1936", shortTitle: "PWA", category: "employment", isRepealed: false, effectiveDate: "1937-03-28", sourceUrl: "https://www.indiacode.nic.in/handle/123456789/2391" },
  { actName: "Negotiable Instruments Act, 1881", shortTitle: "NI Act", category: "civil", isRepealed: false, effectiveDate: "1881-12-09", sourceUrl: "https://www.indiacode.nic.in/handle/123456789/2343" },
  { actName: "Right to Information Act, 2005", shortTitle: "RTI Act", category: "constitutional", isRepealed: false, effectiveDate: "2005-10-12", sourceUrl: "https://www.indiacode.nic.in/handle/123456789/2072" },
  { actName: "Limitation Act, 1963", shortTitle: "Limitation Act", category: "procedure", isRepealed: false, effectiveDate: "1964-01-01", sourceUrl: "https://www.indiacode.nic.in/handle/123456789/2262" },
  { actName: "Protection of Women from Domestic Violence Act, 2005", shortTitle: "DV Act", category: "family", isRepealed: false, effectiveDate: "2006-10-26", sourceUrl: "https://www.indiacode.nic.in/handle/123456789/1602" },
  { actName: "Information Technology Act, 2000", shortTitle: "IT Act", category: "cyber", isRepealed: false, effectiveDate: "2000-10-17", sourceUrl: "https://www.indiacode.nic.in/handle/123456789/1999" },
  { actName: "Hindu Marriage Act, 1955", shortTitle: "HMA", category: "family", isRepealed: false, effectiveDate: "1955-05-18", sourceUrl: "https://www.indiacode.nic.in/handle/123456789/1364" },
  { actName: "Motor Vehicles Act, 1988", shortTitle: "MV Act", category: "civil", isRepealed: false, effectiveDate: "1989-03-01", sourceUrl: "https://www.indiacode.nic.in/handle/123456789/1806" },
  { actName: "Indian Contract Act, 1872", shortTitle: "Contract Act", category: "commercial", isRepealed: false, effectiveDate: "1872-09-01", sourceUrl: "https://www.indiacode.nic.in/handle/123456789/2187" },
];

const SECTIONS: { act: string; sectionNumber: string; heading: string; text: string }[] = [
  {
    act: "Indian Penal Code, 1860",
    sectionNumber: "420",
    heading: "Cheating and dishonestly inducing delivery of property",
    text: "Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person, or to make, alter or destroy the whole or any part of a valuable security, or anything which is signed or sealed, and which is capable of being converted into a valuable security, shall be punished with imprisonment of either description for a term which may extend to seven years, and shall also be liable to fine.",
  },
  {
    act: "Indian Penal Code, 1860",
    sectionNumber: "415",
    heading: "Cheating",
    text: "Whoever, by deceiving any person, fraudulently or dishonestly induces the person so deceived to deliver any property to any person, or to consent that any person shall retain any property, or intentionally induces the person so deceived to do or omit to do anything which he would not do or omit if he were not so deceived, and which act or omission causes or is likely to cause damage or harm to that person in body, mind, reputation or property, is said to 'cheat'.",
  },
  {
    act: "Indian Penal Code, 1860",
    sectionNumber: "406",
    heading: "Punishment for criminal breach of trust",
    text: "Whoever commits criminal breach of trust shall be punished with imprisonment of either description for a term which may extend to three years, or with fine, or with both.",
  },
  {
    act: "Bharatiya Nyaya Sanhita, 2023",
    sectionNumber: "316",
    heading: "Cheating",
    text: "Whoever, by deceiving any person, fraudulently or dishonestly induces the person so deceived to deliver any property to any person, or to consent that any person shall retain any property, or intentionally induces the person so deceived to do or omit to do anything which he would not do or omit if he were not so deceived, and which act or omission causes or is likely to cause damage or harm to that person in body, mind, reputation or property, is said to 'cheat'.",
  },
  {
    act: "Bharatiya Nyaya Sanhita, 2023",
    sectionNumber: "318",
    heading: "Cheating by personation",
    text: "Whoever cheats by personation shall be punished with imprisonment of either description for a term which may extend to three years, or with fine, or with both.",
  },
  {
    act: "Bharatiya Nyaya Sanhita, 2023",
    sectionNumber: "320",
    heading: "Cheating and dishonestly inducing delivery of property",
    text: "Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person, or to make, alter or destroy the whole or any part of a valuable security, or anything which is signed or sealed, and which is capable of being converted into a valuable security, shall be punished with imprisonment of either description for a term which may extend to seven years, and shall also be liable to fine.",
  },
  {
    act: "Bharatiya Nyaya Sanhita, 2023",
    sectionNumber: "303",
    heading: "Theft",
    text: "Whoever, intending to take dishonestly any movable property out of the possession of any person without that person's consent, moves that property in order to such taking, is said to commit theft.",
  },
  {
    act: "Negotiable Instruments Act, 1881",
    sectionNumber: "138",
    heading: "Dishonour of cheque for insufficiency, etc., of funds in the account",
    text: "Where any cheque drawn by a person on an account maintained by him is returned by the bank unpaid, either because of the amount of money standing to the credit of that account is insufficient to honour the cheque or that it exceeds the amount arranged to be paid from that account by an agreement made with that bank, such person shall be deemed to have committed an offence and shall, without prejudice to any other provision of this Act, be punished with imprisonment for a term which may extend to two years, or with fine which may extend to twice the amount of the cheque, or with both.",
  },
  {
    act: "Consumer Protection Act, 2019",
    sectionNumber: "2(11)",
    heading: "Definition of complainant",
    text: "'Complainant' means — (i) a consumer; or (ii) any voluntary consumer association registered under any law for the time being in force; or (iii) the Central Government or any State Government... (v) in case of death of a consumer, his legal heir or legal representative.",
  },
  {
    act: "Consumer Protection Act, 2019",
    sectionNumber: "2(9)",
    heading: "Definition of consumer",
    text: "'Consumer' means any person who — (i) buys any goods for a consideration which has been paid or promised, or partly paid and partly promised... (ii) hires or avails of any services for a consideration... but does not include a person who obtains such goods for resale or for any commercial purpose.",
  },
  {
    act: "Payment of Wages Act, 1936",
    sectionNumber: "5",
    heading: "Time of payment of wages",
    text: "The wages of every person employed upon or in any railway, factory or industrial or other establishment shall be paid before the expiry of the seventh day from the day on which the wages period ends in case wages period is one month or less, and in other cases before the expiry of the tenth day after the close of the wages period.",
  },
  {
    act: "Right to Information Act, 2005",
    sectionNumber: "3",
    heading: "Right to information",
    text: "Subject to the provisions of this Act, all citizens shall have the right to information.",
  },
  {
    act: "Right to Information Act, 2005",
    sectionNumber: "6",
    heading: "Request for obtaining information",
    text: "A person, who desires to obtain any information under this Act, shall make a request in writing or through electronic means in English or Hindi or in the official language of the area in which the application is being made, accompanying such fee as may be prescribed, to the Central Public Information Officer or State Public Information Officer.",
  },
  {
    act: "Limitation Act, 1963",
    sectionNumber: "3",
    heading: "Bar of limitation",
    text: "Subject to the provisions contained in sections 4 to 24 (inclusive), every suit instituted, appeal preferred, and application made after the period of limitation prescribed therefore by the Schedule shall be dismissed although limitation has not been set up as a defence.",
  },
  {
    act: "Limitation Act, 1963",
    sectionNumber: "113",
    heading: "Schedule — Article 113 (residual three years)",
    text: "For any suit for which no period of limitation is provided elsewhere in the Schedule, the period of limitation is three years, and time begins to run when the right to sue accrues.",
  },
  {
    act: "Protection of Women from Domestic Violence Act, 2005",
    sectionNumber: "12",
    heading: "Application to Magistrate",
    text: "An aggrieved person or a Protection Officer or any other person on behalf of the aggrieved person may present an application to the Magistrate seeking one or more reliefs under this Act.",
  },
  {
    act: "Information Technology Act, 2000",
    sectionNumber: "65",
    heading: "Tampering with computer source documents",
    text: "Whoever knowingly or intentionally conceals, destroys or alters any computer source code used for a computer, computer programme, computer system or computer network, when the computer source code is required to be kept or maintained by law for the time being in force, shall be punishable with imprisonment up to three years, or with fine which may extend up to two lakh rupees, or with both.",
  },
  {
    act: "Information Technology Act, 2000",
    sectionNumber: "66C",
    heading: "Punishment for identity theft",
    text: "Whoever, fraudulently or dishonestly makes use of the electronic signature, password or any other unique identification feature of any other person, shall be punished with imprisonment of either description for a term which may extend to three years and shall also be liable to fine which may extend to rupees one lakh.",
  },
  {
    act: "Information Technology Act, 2000",
    sectionNumber: "66D",
    heading: "Punishment for cheating by personation by using computer resource",
    text: "Whoever, by means of any communication device or computer resource, cheats by personation, shall be punished with imprisonment of either description for a term which may extend to three years and shall also be liable to fine which may extend to one lakh rupees.",
  },
  {
    act: "Consumer Protection Act, 2019",
    sectionNumber: "35",
    heading: "Admissibility of complaint",
    text: "The District Commission shall, on receipt of a complaint, admit it unless it appears that there is no sufficient ground to entertain it, and shall refer a copy to the opposite party directing them to give a version within thirty days. A complaint may be filed electronically and the Commission may hear parties through video-conferencing.",
  },
  {
    act: "Consumer Protection Act, 2019",
    sectionNumber: "39",
    heading: "Findings of the District Commission",
    text: "If the District Commission is satisfied that the goods complained against suffer from defects or the services are deficient, it may direct the opposite party to remove the defect, replace the goods, refund the price, pay compensation for loss or injury, discontinue unfair trade practices, or provide any other relief it deems fit.",
  },
  {
    act: "Protection of Women from Domestic Violence Act, 2005",
    sectionNumber: "18",
    heading: "Protection orders",
    text: "The Magistrate may, after giving the respondent an opportunity of being heard, pass a protection order prohibiting the respondent from committing any act of domestic violence, from aiding or abetting such acts, from entering the place of employment or residence of the aggrieved person, or from attempting to communicate with her in any form.",
  },
  {
    act: "Hindu Marriage Act, 1955",
    sectionNumber: "13",
    heading: "Grounds for divorce",
    text: "Any marriage solemnized under this Act may be dissolved by a decree of divorce on grounds including that the other party has, after the marriage, had voluntary sexual intercourse with a person other than the spouse; has deserted the petitioner for a continuous period of not less than two years; has treated the petitioner with cruelty; or suffers from an incurable form of leprosy or venereal disease in a communicable stage.",
  },
  {
    act: "Motor Vehicles Act, 1988",
    sectionNumber: "166",
    heading: "Application for compensation",
    text: "An application for compensation arising out of an accident involving the death of, or bodily injury to, persons arising out of the use of motor vehicles may be made to the Claims Tribunal having jurisdiction, by the person who sustained the injury, by the owner of the property, or where death has resulted, by all or any of the legal representatives of the deceased.",
  },
  {
    act: "Indian Contract Act, 1872",
    sectionNumber: "73",
    heading: "Compensation for loss or damage caused by breach of contract",
    text: "When a contract has been broken, the party who suffers by such breach is entitled to receive, from the party who has broken the contract, compensation for any loss or damage caused to him thereby, which naturally arose in the usual course of things from such breach, or which the parties knew, when they made the contract, to be likely to result from its breach.",
  },
];

const LAW_MAPPINGS: (typeof lawMappings.$inferInsert)[] = [
  {
    pair: "ipc_bns",
    oldAct: "Indian Penal Code, 1860", oldSection: "415",
    newAct: "Bharatiya Nyaya Sanhita, 2023", newSection: "316",
    similarity: "renumbered",
    importantChange: "Substantially re-enacted with minor drafting changes; definition of cheating retained.",
    proceduralImpact: "No change in essence; new cases under BNS.",
    verifiedSource: "https://www.indiacode.nic.in/handle/123456789/25991",
    notes: "Numbering changed from IPC 415 to BNS 316.",
  },
  {
    pair: "ipc_bns",
    oldAct: "Indian Penal Code, 1860", oldSection: "420",
    newAct: "Bharatiya Nyaya Sanhita, 2023", newSection: "320",
    similarity: "renumbered",
    importantChange: "Cheating and dishonestly inducing delivery of property retained with same punishment (7 years).",
    proceduralImpact: "Re-numbering only.",
    verifiedSource: "https://www.indiacode.nic.in/handle/123456789/25991",
  },
  {
    pair: "ipc_bns",
    oldAct: "Indian Penal Code, 1860", oldSection: "406",
    newAct: "Bharatiya Nyaya Sanhita, 2023", newSection: "316",
    similarity: "amended",
    importantChange: "",
    proceduralImpact: "",
    verifiedSource: "https://www.indiacode.nic.in/handle/123456789/25991",
    notes: "Mapping requires verification against the official text.",
  },
  {
    pair: "ipc_bns",
    oldAct: "Indian Penal Code, 1860", oldSection: "378",
    newAct: "Bharatiya Nyaya Sanhita, 2023", newSection: "303",
    similarity: "renumbered",
    importantChange: "Definition of theft retained substantially.",
    proceduralImpact: "Re-numbering only.",
    verifiedSource: "https://www.indiacode.nic.in/handle/123456789/25991",
  },
  {
    pair: "ipc_bns",
    oldAct: "Indian Penal Code, 1860", oldSection: "419",
    newAct: "Bharatiya Nyaya Sanhita, 2023", newSection: "318",
    similarity: "renumbered",
    importantChange: "Cheating by personation retained.",
    proceduralImpact: "Re-numbering only.",
    verifiedSource: "https://www.indiacode.nic.in/handle/123456789/25991",
  },
];

const ROUTES: { title: string; slug: string; category: "employment" | "civil" | "criminal" | "consumer" | "property" | "family" | "cyber" | "commercial" | "constitutional" | "other"; subCategory: string; situationKeywords: string[]; description: string; steps: { order: number; title: string; explanation: string; whyItMatters: string; requiredDocuments: string[]; possibleDeadline?: string; source?: string; actionLabel: string; actionType: string }[] }[] = [
  {
    title: "Salary not paid",
    slug: "unpaid-salary",
    category: "employment",
    subCategory: "unpaid_salary",
    situationKeywords: ["salary", "wages", "not paid", "unpaid", "employer"],
    description: "Route for an employee whose wages have not been paid on time.",
    steps: [
      { order: 1, title: "Collect evidence", explanation: "Gather employment letter, salary slips, bank statements showing non-payment.", whyItMatters: "Written records are the backbone of any wage claim.", requiredDocuments: ["Employment/appointment letter", "Salary slips", "Bank statements"], actionLabel: "Upload documents", actionType: "documents" },
      { order: 2, title: "Send written demand", explanation: "Send a dated written demand to the employer for the unpaid amount.", whyItMatters: "A demand establishes a clear date and shows good faith.", requiredDocuments: ["Draft demand letter", "Proof of delivery"], actionLabel: "Generate demand letter", actionType: "draft" },
      { order: 3, title: "Identify applicable remedy", explanation: "Check which law applies based on your employment type and state (e.g. Payment of Wages Act, 1936 for wages).", whyItMatters: "The forum and procedure depend on the law that applies.", requiredDocuments: [], actionLabel: "View applicable law", actionType: "research" },
      { order: 4, title: "Approach the appropriate authority", explanation: "File a claim with the labour officer/court or civil forum as applicable.", whyItMatters: "The right forum determines whether your claim is heard.", requiredDocuments: ["Claim/complaint", "Evidence"], actionLabel: "See options", actionType: "research" },
      { order: 5, title: "Track progress", explanation: "Keep track of the complaint reference and any hearing dates.", whyItMatters: "Timely follow-up prevents dismissal.", requiredDocuments: ["Complaint reference"], actionLabel: "Track matter", actionType: "timeline" },
    ],
  },
  {
    title: "Security deposit not returned",
    slug: "security-deposit",
    category: "property",
    subCategory: "security_deposit",
    situationKeywords: ["deposit", "landlord", "security deposit", "tenant"],
    description: "Route for recovering a tenancy security deposit.",
    steps: [
      { order: 1, title: "Collect evidence", explanation: "Rent agreement, deposit receipt, photographs of the flat's condition, communication with landlord.", whyItMatters: "Establishes the deposit amount and end of tenancy.", requiredDocuments: ["Rent agreement", "Deposit receipt", "Chat/mail records"], actionLabel: "Upload documents", actionType: "documents" },
      { order: 2, title: "Send a written demand", explanation: "Formal written demand for the refund with a deadline.", whyItMatters: "The starting point before any legal route.", requiredDocuments: ["Demand letter", "Proof of delivery"], actionLabel: "Generate demand letter", actionType: "draft" },
      { order: 3, title: "Consider a consumer/rental remedy", explanation: "Depending on the state's rent law or a consumer claim for deficiency of service, choose a forum.", whyItMatters: "Choosing the correct forum affects time and cost.", requiredDocuments: [], actionLabel: "Compare options", actionType: "research" },
      { order: 4, title: "File the complaint", explanation: "File the complaint/notice with the appropriate authority or forum.", whyItMatters: "Filing formally protects your claim.", requiredDocuments: ["Complaint/notice", "Evidence"], actionLabel: "Generate complaint", actionType: "draft" },
      { order: 5, title: "Track progress", explanation: "Monitor the matter and any hearing dates.", whyItMatters: "Keep the claim alive and prepared.", requiredDocuments: [], actionLabel: "Track matter", actionType: "timeline" },
    ],
  },
  {
    title: "Online scam / fraud",
    slug: "online-fraud",
    category: "cyber",
    subCategory: "online_fraud",
    situationKeywords: ["scam", "fraud", "hacked", "upi", "online"],
    description: "Route for an online financial fraud.",
    steps: [
      { order: 1, title: "Secure accounts & freeze money", explanation: "Contact your bank immediately to freeze/dispute transactions; change passwords.", whyItMatters: "Acting fast increases recovery chances.", requiredDocuments: ["Bank contact details"], actionLabel: "Go to bank", actionType: "external" },
      { order: 2, title: "Collect evidence", explanation: "Transaction messages, UPI refs, chat screenshots, emails.", whyItMatters: "Needed for the cyber complaint.", requiredDocuments: ["Transaction records", "Screenshots"], actionLabel: "Upload evidence", actionType: "documents" },
      { order: 3, title: "Report to the cyber cell", explanation: "Report on the National Cyber Crime Reporting Portal (1930) and file a police complaint.", whyItMatters: "Official record is required to pursue the case.", requiredDocuments: ["Complaint number"], actionLabel: "Report online", actionType: "external" },
      { order: 4, title: "Track the complaint", explanation: "Keep the reference number and follow up.", whyItMatters: "Ensures the matter is not stalled.", requiredDocuments: [], actionLabel: "Track matter", actionType: "timeline" },
    ],
  },
  {
    title: "Consumer complaint",
    slug: "consumer-complaint",
    category: "consumer",
    subCategory: "consumer_complaint",
    situationKeywords: ["refund", "defective", "product", "service"],
    description: "Route for a consumer complaint about goods or services.",
    steps: [
      { order: 1, title: "Collect evidence", explanation: "Invoice, payment record, delivery/tracking details, seller communication.", whyItMatters: "Proves the purchase and the defect.", requiredDocuments: ["Invoice", "Payment record", "Seller communication"], actionLabel: "Upload documents", actionType: "documents" },
      { order: 2, title: "Raise a complaint with the seller", explanation: "Complain to the seller/company first and keep a reference.", whyItMatters: "Consumer law encourages first exhausting direct remedies.", requiredDocuments: ["Complaint reference"], actionLabel: "Draft complaint", actionType: "draft" },
      { order: 3, title: "File with the consumer commission", explanation: "File before the District/State/National Consumer Commission based on value.", whyItMatters: "The commission can award refunds and compensation.", requiredDocuments: ["Complaint", "Evidence"], actionLabel: "Generate complaint", actionType: "draft" },
      { order: 4, title: "Track progress", explanation: "Keep the complaint number and hearing dates.", whyItMatters: "Timely response to notices is critical.", requiredDocuments: [], actionLabel: "Track matter", actionType: "timeline" },
    ],
  },
  {
    title: "Received a legal notice",
    slug: "received-legal-notice",
    category: "civil",
    subCategory: "reply_to_notice",
    situationKeywords: ["legal notice", "notice", "advocate"],
    description: "What to do when you receive a legal notice.",
    steps: [
      { order: 1, title: "Read and date the notice", explanation: "Note the date you received it, who sent it, and what is demanded.", whyItMatters: "Deadlines often run from receipt of notice.", requiredDocuments: ["The notice", "Envelope/proof of receipt"], actionLabel: "Analyze notice", actionType: "documents" },
      { order: 2, title: "Gather your records", explanation: "Collect documents relevant to the claims in the notice.", whyItMatters: "A reply is only as strong as the records behind it.", requiredDocuments: ["Relevant records"], actionLabel: "Upload documents", actionType: "documents" },
      { order: 3, title: "Draft a reply", explanation: "Respond in writing, point-by-point, within the reply period.", whyItMatters: "Silence can be treated as admission in some contexts.", requiredDocuments: ["Reply draft"], actionLabel: "Generate reply", actionType: "draft" },
      { order: 4, title: "Decide next steps", explanation: "Depending on the claims, decide whether to negotiate, settle, or prepare to defend.", whyItMatters: "A timely, well-documented response protects you.", requiredDocuments: [], actionLabel: "See options", actionType: "research" },
    ],
  },
];

const DEADLINE_RULES: (typeof deadlineRules.$inferInsert)[] = [
  {
    triggerEvent: "cheque dishonour",
    action: "File criminal complaint under NI Act s.138 within one month of the dishonour notice period expiry",
    duration: 1, durationUnit: "months",
    statute: "Negotiable Instruments Act, 1881", section: "138",
    source: "NI Act s.138(b) — complaint must be filed within one month of the end of the 15-day demand period",
    exceptions: "Court may condone delay if sufficient cause shown (s.142).",
    isLimitationBar: true,
  },
  {
    triggerEvent: "money recovery",
    action: "File civil suit for recovery",
    duration: 3, durationUnit: "years",
    statute: "Limitation Act, 1963", section: "113",
    source: "Limitation Act Schedule, Art. 113",
    exceptions: "Other specific articles may apply; continuous accrual rules and acknowledgment may extend time.",
    isLimitationBar: true,
  },
  {
    triggerEvent: "legal notice reply",
    action: "Send reply to legal notice",
    duration: 15, durationUnit: "days",
    statute: "General practice", section: null,
    source: "Commonly prescribed reply period; check the notice itself.",
    exceptions: "Notice itself usually specifies the period.",
    isLimitationBar: false,
  },
  {
    triggerEvent: "RTI application",
    action: "Public authority to respond to RTI",
    duration: 30, durationUnit: "days",
    statute: "Right to Information Act, 2005", section: "7",
    source: "RTI Act s.7(1)",
    exceptions: "Extended to 48 days where request forwarded between authorities.",
    isLimitationBar: false,
  },
];

const LEGAL_AID_SERVICES: (typeof legalAidServices.$inferInsert)[] = [
  {
    name: "National Legal Services Authority (NALSA)",
    provider: "NALSA", description: "National body providing free legal services to eligible persons.", state: "National", website: "https://nalsa.gov.in", phone: "15100", serviceType: "free_legal_aid", isOfficial: true,
    eligibility: { "income": "Below specified threshold", "other": "SC/ST, women, children, persons with disability, industrial workmen, custody cases" },
  },
  {
    name: "State Legal Services Authority (SLSA)",
    provider: "SLSA", description: "State-level legal aid body.", state: "All states", website: "https://nalsa.gov.in", serviceType: "free_legal_aid", isOfficial: true,
  },
  {
    name: "District Legal Services Authority (DLSA)",
    provider: "DLSA", description: "District-level free legal aid and Lok Adalats.", state: "All districts", website: "https://nalsa.gov.in", serviceType: "free_legal_aid", isOfficial: true,
  },
  {
    name: "National Cyber Crime Reporting Portal",
    provider: "government", description: "Official portal to report cyber fraud; helpline 1930.", state: "National", website: "https://cybercrime.gov.in", phone: "1930", serviceType: "cyber_complaint", isOfficial: true,
  },
  {
    name: "Taluka Legal Services Committee",
    provider: "DLSA", description: "Sub-district legal aid committee.", state: "All talukas", website: "https://nalsa.gov.in", serviceType: "free_legal_aid", isOfficial: true,
  },
];

const KNOWLEDGE_NODES: (typeof knowledgeNodes.$inferInsert)[] = [
  { type: "PROBLEM", slug: "problem-unpaid-salary", title: "Salary not paid", description: "Employee not paid wages on time." },
  { type: "PROBLEM", slug: "problem-deposit", title: "Security deposit not returned", description: "Tenant unable to recover deposit." },
  { type: "PROBLEM", slug: "problem-fraud", title: "Online fraud", description: "Money taken through online scam." },
  { type: "REMEDY", slug: "remedy-wages-claim", title: "Wage claim", description: "Claim before labour authority/court." },
  { type: "REMEDY", slug: "remedy-recovery", title: "Recovery of money", description: "Civil suit for recovery." },
  { type: "REMEDY", slug: "remedy-consumer", title: "Consumer complaint", description: "Complaint before consumer commission." },
  { type: "STATUTE", slug: "statute-pwa", title: "Payment of Wages Act, 1936" },
  { type: "STATUTE", slug: "statute-cpa", title: "Consumer Protection Act, 2019" },
  { type: "STATUTE", slug: "statute-limitation", title: "Limitation Act, 1963" },
  { type: "SECTION", slug: "section-pwa5", title: "PWA s.5 — time of payment of wages" },
  { type: "PROCEDURE", slug: "procedure-demand", title: "Send written demand" },
  { type: "PROCEDURE", slug: "procedure-complaint", title: "File complaint/notice" },
  { type: "AUTHORITY", slug: "authority-labour-officer", title: "Labour officer / labour court" },
  { type: "AUTHORITY", slug: "authority-consumer-commission", title: "Consumer Commission" },
  { type: "DOCUMENT", slug: "doc-demand-letter", title: "Written demand letter" },
  { type: "DOCUMENT", slug: "doc-invoice", title: "Invoice / payment record" },
  { type: "EVIDENCE_TYPE", slug: "evidence-payslip", title: "Salary slips" },
  { type: "LEGAL_AID_SERVICE", slug: "aid-dlsa", title: "DLSA free legal aid" },
];

const JUDGMENTS: (typeof judgments.$inferInsert)[] = [
  {
    title: "K.S. Puttaswamy v. Union of India — right to privacy",
    court: "Supreme Court of India", citation: "(2017) 10 SCC 1", decisionDate: "2017-08-24",
    summary:
      "A nine-judge Constitution Bench held that the right to privacy is a fundamental right protected by the Constitution, intrinsic to life and personal liberty. Relevant to data-protection, identity theft and surveillance matters. Citation must be verified against the official report.",
    provenance: "demo", sourceUrl: "https://main.sci.gov.in",
  },
  {
    title: "Shreya Singhal v. Union of India — online speech and s.66A IT Act",
    court: "Supreme Court of India", citation: "(2015) 5 SCC 1", decisionDate: "2015-03-24",
    summary:
      "The Supreme Court struck down section 66A of the Information Technology Act as unconstitutional for chilling free expression, while upholding the intermediary-liability framework. Relevant to cyber complaints involving posted content. Citation must be verified against the official report.",
    provenance: "demo", sourceUrl: "https://main.sci.gov.in",
  },
  {
    title: "Arnesh Kumar v. State of Bihar — arrest safeguards",
    court: "Supreme Court of India", citation: "(2014) 8 SCC 273", decisionDate: "2014-07-02",
    summary:
      "Laid down mandatory checklist for police before arresting an accused in offences punishable up to seven years: arrest is not automatic, a notice of appearance must ordinarily issue first, and compliance with section 41A CrPC must be recorded. Relevant to criminal matters where arrest threats are used as pressure. Citation must be verified against the official report.",
    provenance: "demo", sourceUrl: "https://main.sci.gov.in",
  },
];

/* ------------------------------ runner ------------------------------ */

async function main() {
  logger.info("seeding_started");

  for (const s of STATUTES) {
    await db.insert(statutes).values(s).onConflictDoNothing();
  }
  logger.info("statutes_seeded", { count: STATUTES.length });

  const statuteIds = new Map<string, string>();
  for (const s of STATUTES) {
    const rows = await db.select().from(statutes).where(eq(statutes.actName, s.actName)).limit(1);
    if (rows[0]) statuteIds.set(s.actName, rows[0].id);
  }

  for (const sec of SECTIONS) {
    const statuteId = statuteIds.get(sec.act);
    if (!statuteId) continue;
    await db
      .insert(sections)
      .values({
        statuteId,
        actName: sec.act,
        sectionNumber: sec.sectionNumber,
        heading: sec.heading,
        text: sec.text,
        sourceName: "legislative.gov.in",
        sourceUrl: "https://www.indiacode.nic.in",
      })
      .onConflictDoNothing({ target: [sections.actName, sections.sectionNumber] });
  }
  logger.info("sections_seeded", { count: SECTIONS.length });

  for (const m of LAW_MAPPINGS) {
    const existing = await db
      .select({ id: lawMappings.id })
      .from(lawMappings)
      .where(
        sql`${lawMappings.pair} = ${m.pair} AND ${lawMappings.oldSection} = ${m.oldSection} AND ${lawMappings.newSection} = ${m.newSection}`
      )
      .limit(1);
    if (existing.length > 0) continue;
    await db.insert(lawMappings).values(m);
  }
  logger.info("law_mappings_seeded", { count: LAW_MAPPINGS.length });

  for (const r of ROUTES) {
    const [route] = await db
      .insert(legalRoutes)
      .values({
        slug: r.slug,
        title: r.title,
        category: r.category,
        subCategory: r.subCategory,
        description: r.description,
        situationKeywords: r.situationKeywords,
      })
      .onConflictDoNothing({ target: [legalRoutes.slug] })
      .returning({ id: legalRoutes.id });
    if (!route) continue;
    for (const step of r.steps) {
      await db.insert(routeSteps).values({
        routeId: route.id,
        order: step.order,
        title: step.title,
        explanation: step.explanation,
        whyItMatters: step.whyItMatters,
        requiredDocuments: step.requiredDocuments,
        possibleDeadline: step.possibleDeadline,
        source: step.source,
        actionLabel: step.actionLabel,
        actionType: step.actionType,
      });
    }
  }
  logger.info("routes_seeded", { count: ROUTES.length });

  for (const d of DEADLINE_RULES) {
    const existing = await db
      .select({ id: deadlineRules.id })
      .from(deadlineRules)
      .where(sql`${deadlineRules.triggerEvent} = ${d.triggerEvent} AND ${deadlineRules.statute} = ${d.statute}`)
      .limit(1);
    if (existing.length > 0) continue;
    await db.insert(deadlineRules).values(d);
  }
  logger.info("deadline_rules_seeded", { count: DEADLINE_RULES.length });

  for (const s of LEGAL_AID_SERVICES) {
    const existing = await db
      .select({ id: legalAidServices.id })
      .from(legalAidServices)
      .where(sql`${legalAidServices.name} = ${s.name}`)
      .limit(1);
    if (existing.length > 0) continue;
    await db.insert(legalAidServices).values(s);
  }
  logger.info("legal_aid_seeded", { count: LEGAL_AID_SERVICES.length });

  // knowledge graph
  const nodeIds = new Map<string, string>();
  for (const n of KNOWLEDGE_NODES) {
    const [row] = await db
      .insert(knowledgeNodes)
      .values(n)
      .onConflictDoNothing({ target: [knowledgeNodes.slug] })
      .returning({ id: knowledgeNodes.id, slug: knowledgeNodes.slug });
    if (row) nodeIds.set(row.slug, row.id);
    else {
      const existing = await db.select().from(knowledgeNodes).where(eq(knowledgeNodes.slug, n.slug)).limit(1);
      if (existing[0]) nodeIds.set(n.slug, existing[0].id);
    }
  }
  const edgeDefs: { source: string; target: string; type: "HAS_REMEDY" | "GOVERNED_BY" | "PART_OF" | "REQUIRES" | "INTERPRETS" | "APPROPRIATE_FOR" | "NEXT_STEP" | "NEEDS_EVIDENCE" | "FILED_AT" | "APPLIES_TO" }[] = [
    { source: "problem-unpaid-salary", target: "remedy-wages-claim", type: "HAS_REMEDY" },
    { source: "remedy-wages-claim", target: "statute-pwa", type: "GOVERNED_BY" },
    { source: "section-pwa5", target: "statute-pwa", type: "PART_OF" },
    { source: "procedure-demand", target: "doc-demand-letter", type: "REQUIRES" },
    { source: "problem-unpaid-salary", target: "procedure-demand", type: "NEXT_STEP" },
    { source: "remedy-wages-claim", target: "authority-labour-officer", type: "APPROPRIATE_FOR" },
    { source: "remedy-wages-claim", target: "evidence-payslip", type: "NEEDS_EVIDENCE" },
    { source: "problem-deposit", target: "remedy-recovery", type: "HAS_REMEDY" },
    { source: "remedy-recovery", target: "statute-limitation", type: "GOVERNED_BY" },
    { source: "problem-fraud", target: "remedy-consumer", type: "HAS_REMEDY" },
    { source: "problem-fraud", target: "aid-dlsa", type: "APPROPRIATE_FOR" },
  ];
  for (const e of edgeDefs) {
    const s = nodeIds.get(e.source);
    const t = nodeIds.get(e.target);
    if (!s || !t) continue;
    await db.insert(knowledgeEdges).values({ sourceNodeId: s, targetNodeId: t, type: e.type });
  }
  logger.info("knowledge_graph_seeded", { nodes: nodeIds.size, edges: edgeDefs.length });

  for (const j of JUDGMENTS) {
    const existing = await db
      .select({ id: judgments.id })
      .from(judgments)
      .where(sql`${judgments.citation} = ${j.citation}`)
      .limit(1);
    if (existing.length > 0) continue;
    await db.insert(judgments).values(j);
  }
  logger.info("judgments_seeded", { count: JUDGMENTS.length });

  // legal sources records for sections (verification layer)
  for (const sec of SECTIONS) {
    const title = `${sec.act} — Section ${sec.sectionNumber}`;
    const existing = await db
      .select({ id: legalSources.id })
      .from(legalSources)
      .where(sql`${legalSources.title} = ${title} AND ${legalSources.version} = 'seed-1.0'`)
      .limit(1);
    if (existing.length > 0) continue;
    await db.insert(legalSources).values({
      title,
      type: "section",
      authority: sec.act,
      sourceName: "legislative.gov.in",
      url: "https://www.indiacode.nic.in",
      version: "seed-1.0",
      status: "verified",
      retrievedAt: new Date(),
    });
  }
  logger.info("legal_sources_seeded", { count: SECTIONS.length });

  // Demo user for quick access
  const demoEmail = "demo@nyayi.ai";
  const demoPassword = "Demo@1234";
  const existingDemo = await db.select().from(users).where(eq(users.email, demoEmail)).limit(1);
  if (existingDemo.length === 0) {
    const [demoUser] = await db
      .insert(users)
      .values({
        email: demoEmail,
        passwordHash: hashPassword(demoPassword),
        fullName: "Demo User",
        role: "citizen",
        isDemo: true,
        provider: "local",
      })
      .returning({ id: users.id });
    await db.insert(profiles).values({
      userId: demoUser.id,
      displayName: "Demo User",
    });
    logger.info("demo_user_created", { email: demoEmail });
  } else {
    logger.info("demo_user_exists", { email: demoEmail });
  }

  // Embed sections for vector search.
  logger.info("embedding_sections");
  const unembedded = await db.select().from(sections).where(isNull(sections.embedding));
  let done = 0;
  for (const sec of unembedded) {
    const { vector } = await embed(`${sec.actName} ${sec.sectionNumber} ${sec.heading} ${sec.text}`);
    await db.execute(sql`UPDATE sections SET embedding = ${`[${vector.join(",")}]`}::vector WHERE id = ${sec.id}`);
    done++;
  }
  logger.info("embedding_done", { count: done });

  // Embed judgments so case-law is retrievable via RAG.
  logger.info("embedding_judgments");
  const unembeddedJudgments = await db
    .select()
    .from(judgments)
    .where(isNull(judgments.embedding));
  let jDone = 0;
  for (const j of unembeddedJudgments) {
    const { vector } = await embed(`${j.title} ${j.court ?? ""} ${j.summary ?? ""}`);
    await db.execute(sql`UPDATE judgments SET embedding = ${`[${vector.join(",")}]`}::vector WHERE id = ${j.id}`);
    jDone++;
  }
  logger.info("judgment_embedding_done", { count: jDone });
  logger.info("seed_complete");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
