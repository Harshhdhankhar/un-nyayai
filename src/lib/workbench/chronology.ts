/* =========================================================================
 * Chronology Engine — reconstruct the timeline from every recorded source and
 * flag missing dates, conflicting dates, impossible ordering and large gaps.
 *
 * Deterministic and traceable: every event links back to its source, and
 * findings are literal observations (a gap of N days, two sources giving
 * different dates) — never silent overwrites or invented orderings.
 * ========================================================================= */

import type { MatterBundle } from "@/lib/intelligence/inputs";
import type { CaseSnapshotData } from "@/lib/intelligence/inputs";
import type { SourceRef } from "@/lib/intelligence/types";
import { userRef, documentRef } from "@/lib/intelligence/provenance";
import { extractDates } from "@/lib/intelligence/extract";
import { normalizeName } from "@/lib/intelligence/extract";
import type { Chronology, ChronologyEvent, ChronologyFinding } from "./types";

const GAP_THRESHOLD_DAYS = 180;

function diffDays(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00Z`).getTime();
  const db = new Date(`${b}T00:00:00Z`).getTime();
  if (Number.isNaN(da) || Number.isNaN(db)) return 0;
  return Math.round((db - da) / 86400000);
}

export function buildChronology(
  bundle: MatterBundle,
  snapshot: CaseSnapshotData | null
): Chronology {
  const events: ChronologyEvent[] = [];
  let seq = 0;
  const push = (date: string | null, label: string, source: SourceRef, status: ChronologyEvent["status"]) => {
    seq += 1;
    events.push({ id: `cev-${seq}`, date, label, source, status });
  };

  // Matter timeline events.
  for (const ev of bundle.events) {
    const ref: SourceRef =
      ev.source === "ecourts"
        ? { kind: "ecourts", label: "eCourts — Case history", field: "hearing", passage: ev.title, recordId: bundle.cnr ?? undefined }
        : ev.source === "document"
          ? documentRef("Uploaded document", { passage: ev.title })
          : userRef(`Timeline: ${ev.title}`, ev.id);
    const status: ChronologyEvent["status"] =
      ev.source === "ecourts" ? "COURT_RECORD" : ev.source === "document" ? "DOCUMENT_SUPPORTED" : "USER_PROVIDED";
    push(ev.eventDate ?? null, ev.title, ref, status);
  }

  // Facts carrying dates.
  for (const f of bundle.facts) {
    if (f.kind === "missing") continue;
    const dates = extractDates(f.fact);
    if (dates.length === 0) continue;
    const iso = dates[0].iso;
    const ref: SourceRef =
      f.source === "document"
        ? documentRef("Uploaded document", { passage: f.fact })
        : userRef(`Fact: ${f.fact.slice(0, 60)}`, f.id);
    const status: ChronologyEvent["status"] =
      f.source === "ecourts" ? "COURT_RECORD" : f.source === "document" ? "DOCUMENT_SUPPORTED" : "USER_PROVIDED";
    push(iso, f.fact, ref, status);
  }

  // eCourts snapshot hearings + orders.
  if (snapshot) {
    const ref: SourceRef = { kind: "ecourts", label: "eCourts — Case record", recordId: snapshot.cnr, retrievedAt: snapshot.capturedAt };
    for (const h of snapshot.history) {
      push(h.hearingDate, `Hearing: ${h.result || h.purpose || "listed"}`, ref, "COURT_RECORD");
    }
    for (const o of snapshot.orders) {
      push(o.orderDate, `Order: ${o.summary.slice(0, 120)}`, ref, "COURT_RECORD");
    }
  }

  // Dates mentioned in document text (evidence / agreements / notices).
  for (const d of bundle.documents) {
    if (!d.extractedText) continue;
    const dates = extractDates(d.extractedText.slice(0, 6000)).slice(0, 4);
    for (const dt of dates) {
      if (!dt.iso) continue;
      push(dt.iso, `Date referenced in ${d.name}`, documentRef(d.name, { documentId: d.id, passage: dt.raw }), "DOCUMENT_SUPPORTED");
    }
  }

  const findings: ChronologyFinding[] = [];

  // Missing dates.
  const undated = events.filter((e) => !e.date);
  if (undated.length > 0) {
    findings.push({
      kind: "missing_date",
      title: "Events without a recorded date",
      detail: `${undated.length} event(s) have no date: ${undated.slice(0, 4).map((e) => `“${e.label}”`).join(", ")}.`,
      sources: undated.slice(0, 4).map((e) => e.source),
    });
  }

  // Conflicting dates: same normalized label, different dates.
  const byLabel = new Map<string, ChronologyEvent[]>();
  for (const e of events) {
    if (!e.date) continue;
    const key = normalizeName(e.label);
    if (!key || key.length < 4) continue;
    const arr = byLabel.get(key) ?? [];
    arr.push(e);
    byLabel.set(key, arr);
  }
  for (const [, list] of byLabel) {
    const distinct = [...new Set(list.map((e) => e.date))];
    if (distinct.length > 1) {
      // Mark the involved events CONFLICTING.
      for (const e of list) e.status = "CONFLICTING";
      findings.push({
        kind: "date_conflict",
        title: "Conflicting dates for the same event",
        detail: `“${list[0].label}” appears with different dates: ${distinct.join(" vs ")}. Neither is overwritten — review which source is accurate.`,
        sources: list.map((e) => e.source),
      });
    }
  }

  // Impossible ordering: an event dated after today (in the future).
  const today = new Date().toISOString().slice(0, 10);
  const future = events.filter((e) => e.date && e.date > today);
  if (future.length > 0) {
    findings.push({
      kind: "impossible_ordering",
      title: "Events dated in the future",
      detail: `${future.length} event(s) are dated after today (${today}): ${future.slice(0, 4).map((e) => `“${e.label}” (${e.date})`).join(", ")}. This is likely a data-entry or extraction error to confirm.`,
      sources: future.slice(0, 4).map((e) => e.source),
    });
  }

  // Large unexplained gaps between consecutive dated events.
  const dated = events
    .filter((e) => e.date)
    .sort((a, b) => (a.date! < b.date! ? -1 : 1));
  for (let i = 1; i < dated.length; i++) {
    const gap = diffDays(dated[i - 1].date!, dated[i].date!);
    if (gap > GAP_THRESHOLD_DAYS) {
      findings.push({
        kind: "large_gap",
        title: "Large unexplained gap",
        detail: `About ${gap} days between “${dated[i - 1].label}” (${dated[i - 1].date}) and “${dated[i].label}” (${dated[i].date}). Consider whether any event occurred in between.`,
        sources: [dated[i - 1].source, dated[i].source],
      });
    }
  }

  const sorted = events
    .slice()
    .sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date < b.date ? -1 : 1;
    })
    .slice(0, 60);

  return { events: sorted, findings };
}
