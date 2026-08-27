/* =========================================================================
 * Contradiction Detector.
 *
 * Finds places where two records disagree about the SAME thing — and NEVER
 * decides which side is correct. To stay honest (Section 26: no fake
 * intelligence) a contradiction is only raised when values share a clearly
 * labelled context, so we don't mistake "rent = 10k, deposit = 20k" for a
 * conflict. When the link is ambiguous, we stay silent rather than invent one.
 * ========================================================================= */

import type {
  Contradiction,
  ContradictionValue,
  SourceRef,
} from "./types";
import type { CaseSnapshotData, MatterBundle } from "./inputs";
import { extractAmounts, extractDates, normalizeName } from "./extract";
import { userRef } from "./provenance";

interface TextUnit {
  text: string;
  ref: SourceRef;
}

interface LabelMatch {
  match: string;
  canon: string;
}

const AMOUNT_LABELS: LabelMatch[] = [
  { match: "security deposit", canon: "deposit" },
  { match: "deposit", canon: "deposit" },
  { match: "rent", canon: "rent" },
  { match: "salary", canon: "salary" },
  { match: "wages", canon: "salary" },
  { match: "wage", canon: "salary" },
  { match: "compensation", canon: "compensation" },
  { match: "loan", canon: "loan" },
  { match: "advance", canon: "advance" },
  { match: "arrears", canon: "dues" },
  { match: "dues", canon: "dues" },
  { match: "penalty", canon: "penalty" },
  { match: "fine", canon: "penalty" },
  { match: "damages", canon: "damages" },
  { match: "refund", canon: "refund" },
  { match: "cheque", canon: "cheque" },
  { match: "claimed", canon: "claim" },
  { match: "claim", canon: "claim" },
];

const DATE_LABELS: LabelMatch[] = [
  { match: "incident", canon: "incident" },
  { match: "accident", canon: "incident" },
  { match: "agreement", canon: "agreement" },
  { match: "contract", canon: "agreement" },
  { match: "termination", canon: "termination" },
  { match: "terminated", canon: "termination" },
  { match: "dismissal", canon: "termination" },
  { match: "dismissed", canon: "termination" },
  { match: "resignation", canon: "resignation" },
  { match: "resigned", canon: "resignation" },
  { match: "notice", canon: "notice" },
  { match: "filing", canon: "filing" },
  { match: "filed", canon: "filing" },
  { match: "joining", canon: "joining" },
  { match: "joined", canon: "joining" },
  { match: "marriage", canon: "marriage" },
  { match: "married", canon: "marriage" },
];

const LABEL_TITLES: Record<string, string> = {
  deposit: "Deposit amount",
  rent: "Rent amount",
  salary: "Salary / wages",
  compensation: "Compensation amount",
  loan: "Loan amount",
  advance: "Advance amount",
  dues: "Outstanding dues",
  penalty: "Penalty amount",
  damages: "Damages claimed",
  refund: "Refund amount",
  cheque: "Cheque amount",
  claim: "Amount claimed",
  incident: "Date of incident",
  agreement: "Agreement date",
  termination: "Termination date",
  resignation: "Resignation date",
  notice: "Notice date",
  filing: "Filing date",
  joining: "Joining date",
  marriage: "Marriage date",
};

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.;])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Detect the single canonical label present in a sentence, or null if 0 or >1. */
function soleLabel(sentence: string, labels: LabelMatch[]): string | null {
  const lower = sentence.toLowerCase();
  const found = new Set<string>();
  for (const l of labels) {
    if (lower.includes(l.match)) found.add(l.canon);
  }
  return found.size === 1 ? [...found][0] : null;
}

function buildTextUnits(bundle: MatterBundle): TextUnit[] {
  const units: TextUnit[] = [];
  for (const f of bundle.facts) {
    if (f.kind === "missing") continue;
    units.push({ text: f.fact, ref: factUnitRef(f.source, f.fact, f.id) });
  }
  for (const d of bundle.documents) {
    if (d.extractedText) {
      units.push({ text: d.extractedText.slice(0, 8000), ref: { kind: "document", label: d.name, recordId: d.id } });
    } else if (d.summary) {
      units.push({ text: d.summary, ref: { kind: "document", label: d.name, recordId: d.id } });
    }
  }
  for (const s of bundle.sources) {
    if (s.excerpt) units.push({ text: s.excerpt, ref: { kind: "system", label: s.title } });
  }
  for (const n of bundle.notes) {
    units.push({ text: n.body, ref: userRef("Your note", n.id) });
  }
  return units;
}

function factUnitRef(source: string, passage: string, id: string): SourceRef {
  if (source === "ecourts") return { kind: "ecourts", label: "eCourts — Case record", passage };
  if (source === "document") return { kind: "document", label: "Uploaded document", passage };
  return userRef("Your statement", id);
}

interface LabeledValue {
  label: string;
  /** Comparison key (numeric string for amounts, ISO/raw for dates). */
  key: string;
  /** Human display of the value. */
  display: string;
  ref: SourceRef;
}

function scanAmounts(units: TextUnit[]): LabeledValue[] {
  const out: LabeledValue[] = [];
  for (const u of units) {
    for (const sentence of splitSentences(u.text)) {
      const amounts = extractAmounts(sentence);
      if (amounts.length === 0) continue;
      const label = soleLabel(sentence, AMOUNT_LABELS);
      if (!label) continue;
      for (const a of amounts) {
        out.push({ label, key: String(a.value), display: `₹${a.value.toLocaleString("en-IN")}`, ref: u.ref });
      }
    }
  }
  return out;
}

function scanDates(units: TextUnit[]): LabeledValue[] {
  const out: LabeledValue[] = [];
  for (const u of units) {
    for (const sentence of splitSentences(u.text)) {
      const dates = extractDates(sentence);
      if (dates.length === 0) continue;
      const label = soleLabel(sentence, DATE_LABELS);
      if (!label) continue;
      for (const d of dates) {
        out.push({ label, key: d.iso ?? d.raw.toLowerCase(), display: d.raw, ref: u.ref });
      }
    }
  }
  return out;
}

function groupToContradictions(
  values: LabeledValue[],
  kind: Contradiction["kind"],
  idPrefix: string
): Contradiction[] {
  const byLabel = new Map<string, LabeledValue[]>();
  for (const v of values) {
    const arr = byLabel.get(v.label) ?? [];
    arr.push(v);
    byLabel.set(v.label, arr);
  }
  const out: Contradiction[] = [];
  let seq = 0;
  for (const [label, entries] of byLabel) {
    // Distinct value keys.
    const byKey = new Map<string, LabeledValue>();
    for (const e of entries) if (!byKey.has(e.key)) byKey.set(e.key, e);
    if (byKey.size < 2) continue;
    seq += 1;
    const cValues: ContradictionValue[] = [...byKey.values()].map((e) => ({
      value: e.display,
      source: e.ref,
    }));
    out.push({
      id: `${idPrefix}-${seq}`,
      kind,
      label: LABEL_TITLES[label] ?? label,
      values: cValues,
      note:
        "Two records give different values for the same item. NyayAI does not determine which is correct — please confirm the accurate value from your source documents.",
    });
  }
  return out;
}

export function detectContradictions(
  bundle: MatterBundle,
  snapshot?: CaseSnapshotData | null
): Contradiction[] {
  const units = buildTextUnits(bundle);
  const out: Contradiction[] = [
    ...groupToContradictions(scanAmounts(units), "amount", "camt"),
    ...groupToContradictions(scanDates(units), "date", "cdate"),
  ];

  // Party names vs the official eCourts record.
  if (snapshot) {
    const matterNames = bundle.parties
      .map((p) => normalizeName(p.name))
      .filter((n) => n.length >= 3);
    if (matterNames.length > 0) {
      let seq = 0;
      for (const side of ["petitioner", "respondent"] as const) {
        const val = snapshot[side];
        if (!val) continue;
        const norm = normalizeName(val);
        if (!norm || norm.length < 3) continue;
        const matched = matterNames.some((n) => n.includes(norm) || norm.includes(n));
        if (matched) continue;
        seq += 1;
        out.push({
          id: `cname-${seq}`,
          kind: "name",
          label: `${side === "petitioner" ? "Petitioner" : "Respondent"} on the court record`,
          values: [
            {
              value: val,
              source: { kind: "ecourts", label: "eCourts — Case record", field: side, recordId: snapshot.cnr },
            },
            {
              value: bundle.parties.map((p) => p.name).join(", "),
              source: userRef("Parties you recorded"),
            },
          ],
          note:
            "The official court record names a party that does not obviously match the parties you recorded. This may be a spelling variation or a genuinely different party — please verify.",
        });
      }
    }
  }

  return out;
}
