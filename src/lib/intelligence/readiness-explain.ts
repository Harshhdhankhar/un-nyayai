/* =========================================================================
 * Procedural Readiness — explainable dimensions.
 *
 * This is a PREPARATION completeness view, never a prediction of winning.
 * Each dimension reports what is complete and what is missing, with a score
 * derived only from counts of real recorded data. Dimensions with nothing to
 * measure return a null score and "unknown" status rather than a fake number.
 * ========================================================================= */

import type {
  CourtDirection,
  ReadinessDimension,
  ReadinessDimensionKey,
  ReadinessExplanation,
} from "./types";
import type { MatterBundle } from "./inputs";

function statusFor(score: number | null): ReadinessDimension["status"] {
  if (score === null) return "unknown";
  if (score >= 70) return "strong";
  if (score >= 40) return "partial";
  return "thin";
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function dim(
  key: ReadinessDimensionKey,
  label: string,
  score: number | null,
  complete: string[],
  missing: string[]
): ReadinessDimension {
  return { key, label, score, status: statusFor(score), complete, missing };
}

export function explainReadiness(
  bundle: MatterBundle,
  opts: { directions?: CourtDirection[] } = {}
): ReadinessExplanation {
  const dimensions: ReadinessDimension[] = [];

  // 1) Facts ------------------------------------------------------------
  const statements = bundle.facts.filter((f) => f.kind !== "missing").length;
  const openQ = bundle.facts.filter((f) => f.kind === "missing").length;
  if (statements === 0 && openQ === 0) {
    dimensions.push(dim("factCompleteness", "Facts", null, [], ["No facts recorded yet."]));
  } else {
    const score = clamp(Math.min(100, statements * 30) - openQ * 10);
    dimensions.push(
      dim(
        "factCompleteness",
        "Facts",
        score,
        [`${statements} fact${statements === 1 ? "" : "s"} recorded`],
        openQ > 0 ? [`${openQ} open question${openQ === 1 ? "" : "s"} to resolve`] : []
      )
    );
  }

  // 2) Evidence ---------------------------------------------------------
  const evTotal = bundle.evidence.length;
  if (evTotal === 0) {
    dimensions.push(dim("evidenceCoverage", "Evidence", null, [], ["No evidence items tracked."]));
  } else {
    const available = bundle.evidence.filter((e) => e.status === "available").length;
    const missing = bundle.evidence.filter((e) => e.status === "missing").length;
    const needsVer = bundle.evidence.filter((e) => e.status === "needs_verification").length;
    const score = clamp((available / evTotal) * 100);
    dimensions.push(
      dim(
        "evidenceCoverage",
        "Evidence",
        score,
        [`${available} of ${evTotal} item${evTotal === 1 ? "" : "s"} available`],
        [
          ...(missing > 0 ? [`${missing} not yet collected`] : []),
          ...(needsVer > 0 ? [`${needsVer} awaiting verification`] : []),
        ]
      )
    );
  }

  // 3) Documents --------------------------------------------------------
  const docTotal = bundle.documents.length;
  if (docTotal === 0) {
    dimensions.push(dim("documentCoverage", "Documents", null, [], ["No documents uploaded."]));
  } else {
    const analyzed = bundle.documents.filter((d) => d.status === "analyzed").length;
    const score = clamp((analyzed / docTotal) * 100);
    dimensions.push(
      dim(
        "documentCoverage",
        "Documents",
        score,
        [`${analyzed} of ${docTotal} analysed`],
        analyzed < docTotal ? [`${docTotal - analyzed} pending analysis`] : []
      )
    );
  }

  // 4) Timeline ---------------------------------------------------------
  const evCount = bundle.events.length;
  if (evCount === 0) {
    dimensions.push(dim("timelineCompleteness", "Timeline", null, [], ["No timeline events recorded."]));
  } else {
    const dated = bundle.events.filter((e) => e.eventDate).length;
    const score = clamp(Math.min(100, dated * 25));
    dimensions.push(
      dim(
        "timelineCompleteness",
        "Timeline",
        score,
        [`${dated} dated event${dated === 1 ? "" : "s"}`],
        evCount - dated > 0 ? [`${evCount - dated} event${evCount - dated === 1 ? "" : "s"} without a date`] : []
      )
    );
  }

  // 5) Source verification ---------------------------------------------
  const srcTotal = bundle.sources.length;
  if (srcTotal === 0) {
    dimensions.push(dim("sourceVerification", "Legal sources", null, [], ["No legal sources attached."]));
  } else {
    const verified = bundle.sources.filter((s) => s.status === "verified").length;
    const needs = bundle.sources.filter((s) => s.status === "needs_verification").length;
    const score = clamp((verified / srcTotal) * 100);
    dimensions.push(
      dim(
        "sourceVerification",
        "Legal sources",
        score,
        [`${verified} of ${srcTotal} verified`],
        needs > 0 ? [`${needs} need verification`] : []
      )
    );
  }

  // 6) Court direction compliance --------------------------------------
  const directions = opts.directions ?? [];
  if (directions.length === 0) {
    dimensions.push(
      dim("courtDirectionCompliance", "Court directions", null, [], ["No court directions detected."])
    );
  } else {
    const done = directions.filter((d) => d.compliance === "possibly_done").length;
    const pending = directions.filter((d) => d.compliance === "pending").length;
    const score = clamp((done / directions.length) * 100);
    dimensions.push(
      dim(
        "courtDirectionCompliance",
        "Court directions",
        score,
        done > 0 ? [`${done} appear addressed`] : [],
        pending > 0 ? [`${pending} appear pending — please confirm`] : []
      )
    );
  }

  // 7) Research coverage ------------------------------------------------
  const authorities = bundle.sources.filter((s) => s.type === "judgment" || Boolean(s.url)).length;
  if (authorities === 0) {
    dimensions.push(dim("researchCoverage", "Research", null, [], ["No authorities linked yet."]));
  } else {
    const score = clamp(Math.min(100, authorities * 34));
    dimensions.push(dim("researchCoverage", "Research", score, [`${authorities} authority link(s)`], []));
  }

  const scored = dimensions.map((d) => d.score).filter((s): s is number => s !== null);
  const overall = scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : 0;

  return { overall, dimensions };
}
