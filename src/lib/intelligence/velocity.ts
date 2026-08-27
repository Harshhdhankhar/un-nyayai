/* =========================================================================
 * Case Velocity — a factual timeline of how a matter has progressed through
 * its hearings. Deliberately NOT a score: it labels each recorded period with
 * a factual category (Active Progress / Adjournment-heavy / Long Gap /
 * Substantive Hearing / Awaiting Next Listing) so delay analysis is visually
 * memorable without inventing a metric. Every segment is source-backed.
 * ========================================================================= */

import type { CaseSnapshotData } from "./inputs";
import type { SourceRef } from "./types";
import { analyzeHearings } from "@/lib/legal/delay-analysis";
import type { ECourtHearing } from "@/lib/providers/ecourts/types";

export type VelocityLabel =
  | "Active Progress"
  | "Adjournment-heavy"
  | "Long Gap"
  | "Substantive Hearing"
  | "Awaiting Next Listing";

export interface VelocitySegment {
  label: VelocityLabel;
  /** Approximate date span of the period (hearing dates). */
  from: string;
  to: string;
  count: number;
  /** Plain reason this period is labelled this way. */
  why: string;
  sources: SourceRef[];
}

export interface CaseVelocity {
  segments: VelocitySegment[];
  /** Factual summary line. */
  summary: string;
  source: SourceRef;
}

/* --------------------------- procedural patterns ------------------------- */

export interface ProceduralPattern {
  label: string;
  detail: string;
  /** Factual, non-accusatory observation. */
  why: string;
  /** Hearing dates / sources this pattern is drawn from. */
  sources: SourceRef[];
}

const STAGE_RE = /evidence|recording|trial|examination|notice|service/i;

export function buildProceduralPatterns(snapshot: CaseSnapshotData): ProceduralPattern[] {
  const out: ProceduralPattern[] = [];
  const source: SourceRef = {
    kind: "ecourts",
    label: "eCourts — Case history",
    field: "history",
    recordId: snapshot.cnr,
    retrievedAt: snapshot.capturedAt,
  };
  const hearings = snapshot.history;
  if (hearings.length === 0) return out;

  // 1) Repeated same-stage hearings (3+ evidence-stage listings).
  const atStage = hearings.filter((h) => STAGE_RE.test(`${h.purpose ?? ""} ${h.result ?? ""}`));
  if (atStage.length >= 3) {
    out.push({
      label: "Evidence-stage stagnation",
      detail: `The record shows ${atStage.length} listings at the evidence stage.`,
      why: "NyayAI flags this because several consecutive listings relate to evidence without a recorded move to the next stage. The record may simply not capture the progress.",
      sources: atStage.map((h) => ({ ...source, passage: `${h.hearingDate} — ${h.purpose ?? ""}` })),
    });
  }

  // 2) Repeated time-sought (3+).
  const timeSought = hearings.filter((h) => /time sought|adjournment sought|to seek time|time was sought|both parties sought time/i.test(`${h.purpose ?? ""} ${h.result ?? ""}`));
  if (timeSought.length >= 3) {
    out.push({
      label: "Repeated requests for time",
      detail: `${timeSought.length} recorded listings were adjourned on a request for time.`,
      why: "NyayAI flags this because the reason recurs across multiple listings.",
      sources: timeSought.map((h) => ({ ...source, passage: `${h.hearingDate} — ${h.result ?? ""}` })),
    });
  }

  // 3) Repeated absence.
  const absent = hearings.filter((h) => /absent|not present|no appearance/i.test(`${h.purpose ?? ""} ${h.result ?? ""}`));
  if (absent.length >= 2) {
    out.push({
      label: "Repeated absence noted",
      detail: `${absent.length} listings record a party as absent.`,
      why: "NyayAI flags this only where the record explicitly notes absence.",
      sources: absent.map((h) => ({ ...source, passage: `${h.hearingDate} — ${h.result ?? ""}` })),
    });
  }

  // 4) Long gap between hearings.
  const analysis = analyzeHearings(hearings.map((h) => ({ hearingDate: h.hearingDate, purpose: h.purpose ?? "", result: h.result ?? "", orderSummary: h.orderSummary ?? "" })));
  if (analysis.longestGap !== null && analysis.longestGap >= LONG_GAP_DAYS) {
    out.push({
      label: "Long gap between listings",
      detail: `The longest gap between recorded listings is about ${analysis.longestGap} days.`,
      why: "A large interval between listings may reflect the court's workload or listing practice; the record alone does not say why.",
      sources: [source],
    });
  }

  // 5) Unclear recurring adjournments.
  if (analysis.unclear >= 3) {
    out.push({
      label: "Repeated adjournments without a clear reason",
      detail: `${analysis.unclear} listings have no clearly recorded reason for the adjournment.`,
      why: "NyayAI flags these because the record does not state why they were adjourned.",
      sources: [source],
    });
  }

  return out;
}

const LONG_GAP_DAYS = 180;

function toECourtHearing(h: CaseSnapshotData["history"][number]): ECourtHearing {
  return {
    hearingDate: h.hearingDate,
    purpose: h.purpose ?? "",
    result: h.result ?? "",
    orderSummary: h.orderSummary ?? "",
  };
}

function labelFor(reason: string): VelocityLabel {
  return reason === "substantive hearing" ? "Substantive Hearing" : "Adjournment-heavy";
}

function collapse(segments: VelocitySegment[]): VelocitySegment[] {
  const out: VelocitySegment[] = [];
  for (const seg of segments) {
    const last = out[out.length - 1];
    if (last && last.label === seg.label) {
      last.to = seg.to;
      last.count += seg.count;
      last.sources.push(...seg.sources);
      if (seg.why !== last.why) last.why = last.why;
    } else {
      out.push({ ...seg, sources: [...seg.sources] });
    }
  }
  return out;
}

export function buildCaseVelocity(snapshot: CaseSnapshotData): CaseVelocity {
  const history = snapshot.history.map(toECourtHearing);
  const analysis = analyzeHearings(history);
  const source: SourceRef = {
    kind: "ecourts",
    label: "eCourts — Case history",
    field: "history",
    recordId: snapshot.cnr,
    retrievedAt: snapshot.capturedAt,
  };

  const raw: VelocitySegment[] = [];
  if (analysis.total === 0) {
    return {
      segments: [{ label: "Awaiting Next Listing", from: "", to: "", count: 0, why: "No hearings are recorded yet.", sources: [source] }],
      summary: "No hearing history is recorded for this matter yet.",
      source,
    };
  }

  for (const h of analysis.hearings) {
    if (h.gapDays !== null && h.gapDays > LONG_GAP_DAYS) {
      raw.push({
        label: "Long Gap",
        from: h.hearingDate,
        to: h.hearingDate,
        count: 1,
        why: `About ${h.gapDays} days passed before this listing — the longest gap between recorded hearings.`,
        sources: [{ ...source, passage: `${h.hearingDate} — gap of ~${h.gapDays} days` }],
      });
    }
    const label = labelFor(h.reason);
    const why =
      label === "Substantive Hearing"
        ? "This listing recorded substantive progress."
        : "This listing was adjourned without substantive progress (request for time, absence, or a non-substantive reason).";
    raw.push({
      label,
      from: h.hearingDate,
      to: h.hearingDate,
      count: 1,
      why,
      sources: [{ ...source, passage: `${h.hearingDate} — ${h.purpose || ""} ${h.result || ""}` }],
    });
  }

  // Bookend: active progress (case filed → first hearing) and awaiting next.
  const first = analysis.hearings[0];
  raw.unshift({
    label: "Active Progress",
    from: snapshot.capturedAt.slice(0, 10),
    to: first.hearingDate,
    count: 1,
    why: "The matter progressed to its first recorded listing.",
    sources: [source],
  });
  if (!snapshot.nextHearingDate) {
    const last = analysis.hearings[analysis.hearings.length - 1];
    raw.push({
      label: "Awaiting Next Listing",
      from: last.hearingDate,
      to: snapshot.capturedAt.slice(0, 10),
      count: 1,
      why: "No next hearing date is recorded after the last listing.",
      sources: [source],
    });
  }

  const segments = collapse(raw);

  const buckets = segments.reduce<Record<string, number>>((acc, s) => {
    acc[s.label] = (acc[s.label] ?? 0) + s.count;
    return acc;
  }, {});
  const heavy = buckets["Adjournment-heavy"] ?? 0;
  const substantive = buckets["Substantive Hearing"] ?? 0;
  const summary = analysis.total > 0
    ? `Records show ${analysis.total} listings: ${heavy} adjournment-heavy, ${substantive} substantive.`
    : "No hearings recorded.";

  return { segments, summary, source };
}