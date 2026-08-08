import type { DraftKind } from "./service";

export interface DraftMeta {
  parties: { name: string; role?: string }[];
  amounts: string[];
  dates: string[];
  facts: string[];
  laws: string[];
}

export interface TemplateDefinition {
  kind: DraftKind;
  label: string;
  description: string;
}

export const templates: TemplateDefinition[] = [
  { kind: "legal_notice", label: "Legal notice", description: "Formal demand / notice before action" },
  { kind: "consumer_complaint", label: "Consumer complaint", description: "Complaint to consumer forum" },
  { kind: "rti_application", label: "RTI application", description: "Request for government information" },
  { kind: "reply_to_notice", label: "Reply to notice", description: "Response to a legal notice" },
  { kind: "basic_complaint", label: "Complaint / plaint", description: "Basic court complaint" },
  { kind: "rent_agreement", label: "Rent agreement", description: "Tenancy / lease agreement" },
  { kind: "employment_representation", label: "Employment representation", description: "Letter to employer re: grievance" },
];

type MetaPick = (m: DraftMeta) => string;
type Template = { title: MetaPick; body: MetaPick };

export const templateBuilders: Record<DraftKind, Template> = {
  legal_notice: {
    title: (m) => `Legal notice re: ${m.parties[1]?.name ?? "dispute"}`,
    body: (m) => {
      const you = m.parties[1]?.name ?? "Recipient";
      const client = m.parties[0]?.name ?? "our client";
      const facts = m.facts.join("; ");
      const demand = m.amounts.length ? `pay the sum of ${m.amounts.join(", ")}` : "rectify the matter";
      return `LEGAL NOTICE

To,
${you}${m.parties[1]?.role ? ` (${m.parties[1].role})` : ""}

Dear Sir/Madam,

1. Our client, ${client}, hereby states the following:
   ${facts}

2. The above facts amount to a breach of your obligations and of our client's legal rights.

3. Despite the above, you have failed to cure the breach within the reasonable time provided.

4. By this notice, our client calls upon you to:
   (a) ${demand};
   (b) provide written confirmation of compliance within 15 days.

5. In case of failure to comply, our client shall be constrained to initiate appropriate legal proceedings for recovery along with interest, costs and such other relief as may be available under law.

6. Nothing in this notice shall waive any of our client's rights, all of which are expressly reserved.

Yours faithfully,
For and on behalf of ${client}`;
    },
  },

  consumer_complaint: {
    title: (m) => `Consumer complaint re: ${m.parties[1]?.name ?? "defective goods/services"}`,
    body: (m) => {
      const complainant = m.parties[0]?.name ?? "Complainant";
      const op = m.parties[1]?.name ?? "Opposite Party";
      const facts = m.facts.join("; ");
      const date = m.dates[0] ?? "the events above took place";
      const refund = m.amounts[0] ?? "the amount paid";
      return `BEFORE THE CONSUMER COMPLAINT REDRESSAL COMMISSION

IN THE MATTER OF:
${complainant} — Complainant
versus
${op} — Opposite Party

COMPLAINT UNDER THE CONSUMER PROTECTION ACT, 2019

1. PARTICULARS OF COMPLAINANT AND OPPOSITE PARTY.

2. FACTS OF THE CASE:
   ${facts}

3. The complainant availed the goods/services of the opposite party and paid consideration.

4. The service was deficient / goods were defective, as detailed above.

5. Despite representations and notice, the opposite party failed to resolve the grievance.

6. CAUSE OF ACTION arose when ${date}.

7. RELIEF SOUGHT:
   (a) Refund of ${refund}.
   (b) Compensation for mental agony and deficiency in service.
   (c) Costs of the proceedings.

PRAYER

It is, therefore, most respectfully prayed that this Hon'ble Commission may be pleased to allow the complaint in the interest of justice.

Complainant through counsel`;
    },
  },

  rti_application: {
    title: () => "RTI application",
    body: (m) => {
      const dept = m.parties[1]?.name ?? "Concerned Department";
      const applicant = m.parties[0]?.name ?? "Applicant";
      const info = m.facts.join("; ");
      return `RTI APPLICATION
(Right to Information Act, 2005)

To,
The Public Information Officer,
${dept}

1. Name of Applicant: ${applicant}
2. Address: ________
3. Information sought:
   ${info}

4. The information sought does not relate to any third party and is not exempted under the Act.

5. Fee of ₹10 is being paid / remitted as prescribed.

6. If the requested information is refused, I may be informed of the reasons and the appellate authority.

Yours faithfully,
${applicant}`;
    },
  },

  reply_to_notice: {
    title: (m) => `Reply to notice re: ${m.parties[1]?.name ?? "claim"}`,
    body: (m) => {
      const client = m.parties[0]?.name ?? "Our client";
      const sender = m.parties[1]?.name ?? "The notice sender";
      const date = m.dates[0] ?? "__";
      const facts = m.facts.join("; ");
      const amount = m.amounts[0] ?? "any amount";
      return `REPLY TO LEGAL NOTICE

From:
${client}

To:
${sender}

Dear Sir/Madam,

1. We are instructed by our client to reply to your notice dated ${date} and we do so as follows.

2. The allegations in the notice are denied. Our client states:
   ${facts}

3. The claim of ${amount} is disputed and denied.

4. Your notice is misconceived and is not maintainable. Our client reserves all rights including the right to pursue appropriate remedies.

Yours faithfully,
For and on behalf of ${client}`;
    },
  },

  basic_complaint: {
    title: (m) => `Complaint re: ${m.parties[1]?.name ?? "dispute"}`,
    body: (m) => {
      const plaintiff = m.parties[0]?.name ?? "Plaintiff";
      const defendant = m.parties[1]?.name ?? "Defendant";
      const facts = m.facts.join("; ");
      const date = m.dates[0] ?? "__";
      const amount = m.amounts[0] ?? "the claimed amount";
      return `COMPLAINT / PLAINT

IN THE COURT OF __________

IN THE MATTER OF:
${plaintiff} — Plaintiff
versus
${defendant} — Defendant

1. Parties and jurisdiction.

2. FACTS:
   ${facts}

3. The plaintiff is entitled to relief as the defendant's actions are contrary to law and facts.

4. CAUSE OF ACTION arose on ${date}.

5. No suit / proceeding is pending between the parties on the same cause of action.

PRAYER

It is prayed that this Hon'ble Court be pleased to:
(a) decree the suit in favour of the plaintiff;
(b) award ${amount} with interest;
(c) award costs; and
(d) grant any other relief deemed fit.

Plaintiff through counsel`;
    },
  },

  rent_agreement: {
    title: () => "Rent agreement",
    body: (m) => {
      const landlord = m.parties[0]?.name ?? "Landlord";
      const tenant = m.parties[1]?.name ?? "Tenant";
      const date = m.dates[0] ?? "__";
      const rent = m.amounts[0] ?? "₹___";
      const deposit = m.amounts[1] ?? "₹___";
      return `RENT AGREEMENT

This agreement is made on ${date} between ${landlord} (Landlord) and ${tenant} (Tenant).

1. The Landlord lets the premises to the Tenant for residential use.
2. Rent: ${rent} per month, payable by the 7th of each month.
3. Security deposit: ${deposit}, refundable on termination subject to deductions for damages.
4. Term: ___ months from the date of possession.
5. The Tenant shall maintain the premises and permit reasonable inspection.
6. Either party may terminate with ___ months' notice.
7. Electricity/water charges payable by the Tenant as per meter reading.
8. Stamp duty and registration, if applicable, payable as per law.

Signatures:
Landlord: __________     Tenant: __________`;
    },
  },

  employment_representation: {
    title: (m) => `Representation re: ${m.parties[1]?.name ?? "employment grievance"}`,
    body: (m) => {
      const company = m.parties[1]?.name ?? "Company";
      const employee = m.parties[0]?.name ?? "Employee";
      const facts = m.facts.join("; ");
      return `REPRESENTATION

To,
The HR Department,
${company}

Subject: Representation regarding employment grievance

1. I, ${employee}, employee of the company, submit this representation.

2. FACTS:
   ${facts}

3. The above action is in violation of my employment terms and applicable labour laws.

4. I request that the matter be examined and the grievance redressed.

5. I remain willing to cooperate in any inquiry.

Yours sincerely,
${employee} (Employee)`;
    },
  },
};
