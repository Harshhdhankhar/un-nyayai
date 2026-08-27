/* =========================================================================
 * Case Journey — a concise, chronological narrative of a matter's court
 * history. Turns a long hearing table into a readable story WITHOUT losing
 * the underlying records: every statement is traceable to a specific source
 * (eCourts hearing/order or a recorded Matter event). Pure, deterministic,
 * no LLM, no fabricated transitions.
 * ========================================================================= */

import type { CaseSnapshotData, MatterBundle } from "./inputs";
import type { SourceRef } from "./types";

export interface JourneyStatement {
  text: string;
  /** Source(s) this statement is directly traceable to. */
  sources: SourceRef[];
}

export interface CaseJourney {
  statements: JourneyStatement[];
  /** Source-backed summary of where the case now stands. */
  current: string;
  /** The full, un-collapsed hearing list (kept available alongside the story). */
  hearings: CaseSnapshotData["history"];
  nextHearingDate: string | null;
}

function stageOf(purpose: string): string {
  const p = purpose.toLowerCase();
  if (/notice|service/.test(p)) return "notice";
  if (/admission|admit/.test(p)) return "admission";
  if (/evidence|recording|trial|witness|examination/.test(p)) return "evidence";
  if (/argument|final|hearing|disposal|judgment|judgement/.test(p)) return "argument";
  if (/order|compliance/.test(p)) return "order";
  return "other";
}

const STAGE_LABEL: Record<string, string> = {
  notice: "notice/service stage",
  admission: "admission stage",
  evidence: "evidence stage",
  argument: "argument/final-hearing stage",
  order: "order/compliance stage",
  other: "listed hearings",
};

export function buildCaseJourney(
  snapshot: CaseSnapshotData | null,
  bundle: MatterBundle
): CaseJourney {
  const statements: JourneyStatement[] = [];
  const hearings = snapshot?.history ?? [];
  const orders = snapshot?.orders ?? [];
  const recordSource: SourceRef = snapshot
    ? { kind: "ecourts", label: "eCourts — Case history", field: "history", recordId: snapshot.cnr, retrievedAt: snapshot.capturedAt }
    : { kind: "ecourts", label: "eCourts — Case record" };
  const orderSource: SourceRef = snapshot
    ? { kind: "ecourts", label: "eCourts — Orders", field: "orders", recordId: snapshot.cnr, retrievedAt: snapshot.capturedAt }
    : { kind: "ecourts", label: "eCourts — Case record" };

  // 1) Filing.
  if (snapshot) {
    statements.push({
      text: `The matter is on the court record (${snapshot.petitioner ?? "petitioner"} vs ${snapshot.respondent ?? "respondent"}).`,
      sources: [recordSource],
    });
  } else if (bundle.parties.length > 0) {
    statements.push({
      text: `This Matter involves ${bundle.parties.map((p) => p.name).join(" and ")}.`,
      sources: bundle.parties.map((p) => ({ kind: "user", label: `Party: ${p.name}`, recordId: p.id })),
    });
  }

  if (hearings.length > 0) {
    // 2) Detect stage progression (first occurrence order).
    const stagesSeen: string[] = [];
    for (const h of hearings) {
      const st = stageOf(h.purpose ?? "");
      if (st !== "other" && !stagesSeen.includes(st)) stagesSeen.push(st);
    }
    for (const st of stagesSeen) {
      const inStage = hearings.filter((h) => stageOf(h.purpose ?? "") === st);
      const first = inStage[0];
      const last = inStage[inStage.length - 1];
      const range =
        first.hearingDate === last.hearingDate
          ? ` on ${first.hearingDate}`
          : ` from ${first.hearingDate} to ${last.hearingDate}`;
      statements.push({
        text: `The case was at the ${STAGE_LABEL[st]}${range} (${inStage.length} recorded listing${inStage.length === 1 ? "" : "s"}).`,
        sources: inStage.map((h) => ({ ...recordSource, passage: `${h.hearingDate} — ${h.purpose ?? ""}` })),
      });
    }

    // 3) Collapse repeated same-stage hearings into one statement when they
    //    form a run of 3+ at the same stage (procedural pattern, not blame).
    let runStage = "";
    let runCount = 0;
    let runFirstDate = "";
    const flushed: Array<{ stage: string; count: number; first: string; last: string }> = [];
    for (let i = 0; i < hearings.length; i++) {
      const h = hearings[i];
      const st = stageOf(h.purpose ?? "");
      if (st === runStage) {
        runCount += 1;
      } else {
        // A run just ended at index i-1; the run's last date is the previous
        // hearing, NOT the current (next-stage) hearing.
        if (runCount >= 3) {
          flushed.push({ stage: runStage, count: runCount, first: runFirstDate, last: hearings[i - 1].hearingDate });
        }
        runStage = st;
        runCount = 1;
        runFirstDate = h.hearingDate;
      }
    }
    // Flush any trailing run; its dates span from the run start to the end.
    if (runCount >= 3) {
      flushed.push({ stage: runStage, count: runCount, first: runFirstDate, last: hearings[hearings.length - 1].hearingDate });
    }
    for (const f of flushed) {
      if (f.stage === "other") continue;
      statements.push({
        text: `The matter remained at the ${STAGE_LABEL[f.stage]} across ${f.count} recorded hearings (${f.first} → ${f.last}).`,
        sources: hearings
          .filter((h) => stageOf(h.purpose ?? "") === f.stage)
          .map((h) => ({ ...recordSource, passage: `${h.hearingDate} — ${h.purpose ?? ""}` })),
      });
    }
  }

  // 4) Orders on record.
  if (orders.length > 0) {
    const latest = orders[orders.length - 1];
    statements.push({
      text: `${orders.length} order${orders.length === 1 ? " was" : "s were"} recorded${latest?.orderDate ? `, the latest on ${latest.orderDate}` : ""}${latest?.summary ? ` — ${latest.summary}` : ""}.`,
      sources: orders.map((o) => ({ ...orderSource, passage: o.summary || `Order ${o.orderDate}` })),
    });
  }

  // 5) Latest recorded hearing.
  const last = hearings[hearings.length - 1];
  if (last?.hearingDate) {
    statements.push({
      text: `The last recorded hearing was on ${last.hearingDate}${last.purpose ? ` (${last.purpose})` : ""}${last.result ? ` — ${last.result}` : ""}.`,
      sources: [{ ...recordSource, passage: `${last.hearingDate} — ${last.result ?? last.purpose ?? ""}` }],
    });
  }

  // 6) Next hearing.
  const nextHearingDate = snapshot?.nextHearingDate ?? null;
  if (nextHearingDate) {
    statements.push({
      text: `The next hearing is recorded on ${nextHearingDate}.`,
      sources: [{ kind: "ecourts", label: "eCourts — Case record", field: "next_hearing_date", recordId: snapshot?.cnr, retrievedAt: snapshot?.capturedAt }],
    });
  } else {
    statements.push({
      text: snapshot?.caseStatus === "disposed"
        ? "The court record marks this case as disposed."
        : "No next hearing date is recorded yet.",
      sources: [recordSource],
    });
  }

  const current =
    last?.hearingDate
      ? `Last recorded hearing ${last.hearingDate}.${nextHearingDate ? ` Next: ${nextHearingDate}.` : ""}`
      : nextHearingDate
        ? `Next hearing on ${nextHearingDate}.`
        : "No hearing history is recorded yet.";

  return { statements, current, hearings, nextHearingDate };
}