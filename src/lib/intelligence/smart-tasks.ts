/* =========================================================================
 * Smart Task Generation — turns pending court directions into actionable,
 * provenance-carrying suggested tasks.
 *
 * Deterministic. Each suggested task records WHY it exists ("Generated from:
 * Court Order dated X") and WHERE it came from, so the user can verify it.
 * This is a suggestion layer — it never marks compliance itself.
 * ========================================================================= */

import type { CourtDirection } from "./types";
import type { SourceRef } from "./types";

export type SmartTaskKind = "respond" | "produce" | "appear" | "verify" | "review" | "comply";

export interface SmartTask {
  id: string;
  kind: SmartTaskKind;
  title: string;
  /** What the direction asks for, verbatim where possible. */
  detail: string;
  /** Provenance — "Generated from: <order label>". */
  provenance: string;
  source: SourceRef;
  /** Optional derived due date (needs verification). */
  dueDate: string | null;
}

const KIND_OF: Array<{ re: RegExp; kind: SmartTaskKind }> = [
  { re: /reply|counter affidavit|counter-affidavit|counter affidavit|rejoinder|response|objection/i, kind: "respond" },
  { re: /produce|file |furnish|submit|disclose|place on record|render|pay|deposit/i, kind: "produce" },
  { re: /appear|court on|next date|list /i, kind: "appear" },
  { re: /affidavit of evidence|examine|cross.examin|lead evidence/i, kind: "comply" },
  { re: /verify|confirm/i, kind: "verify" },
  { re: /review|consider|inform/i, kind: "review" },
];

function classify(text: string): SmartTaskKind {
  for (const { re, kind } of KIND_OF) {
    if (re.test(text)) return kind;
  }
  return "comply";
}

export function suggestTasks(directions: CourtDirection[]): SmartTask[] {
  const seen = new Set<string>();
  const tasks: SmartTask[] = [];

  for (const d of directions) {
    if (d.compliance === "possibly_done") continue;
    const key = d.text.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);

    const who = d.addressee ? `${d.addressee} ` : "";
    const title = `${who}${d.text}`.replace(/\s+/g, " ").trim();
    const orderLabel = d.source.label || "court order";
    const provenance = `Generated from: ${orderLabel}`;

    tasks.push({
      id: `st-${tasks.length + 1}`,
      kind: classify(d.text),
      title,
      detail: d.text,
      provenance,
      source: d.source,
      dueDate: d.deadline?.dueDate ?? null,
    });
  }

  return tasks;
}

export function summarizeTasks(tasks: SmartTask[]): string {
  if (tasks.length === 0) return "No pending directions found to act on.";
  const counts = new Map<SmartTaskKind, number>();
  for (const t of tasks) counts.set(t.kind, (counts.get(t.kind) ?? 0) + 1);
  const parts = [...counts.entries()].map(([kind, n]) => `${n} ${kind}`);
  return `${tasks.length} suggested task${tasks.length === 1 ? "" : "s"} from court directions (${parts.join(", ")}).`;
}