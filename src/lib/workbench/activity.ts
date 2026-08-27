/* =========================================================================
 * Intelligence Activity Feed — compact, meaningful system discoveries.
 *
 * Only surfaced when there is a real, source-backed discovery. No fake "AI is
 * thinking" chatter. Sorted most-important first.
 * ========================================================================= */

import type {
  CourtDirection,
  Contradiction,
  MissingItem,
  SnapshotChange,
} from "@/lib/intelligence/types";
import type { ActivityItem, Chronology, SourceRef } from "./types";

export interface ActivityContext {
  changes: SnapshotChange[];
  directions: CourtDirection[];
  missing: MissingItem[];
  contradictions: Contradiction[];
  chronology: Chronology;
  authorityCount: number;
  evidenceSupportCount: number;
}

export function buildActivityFeed(ctx: ActivityContext): ActivityItem[] {
  const items: ActivityItem[] = [];
  const pushItem = (
    kind: ActivityItem["kind"],
    title: string,
    detail: string | undefined,
    sources: SourceRef[]
  ) => {
    items.push({ id: `actfeed-${items.length + 1}`, kind, title, detail, sources });
  };

  // Court / hearing changes (most important).
  for (const c of ctx.changes) {
    const kind = c.kind === "next_hearing_changed" || c.kind === "new_listing" ? "hearing" : "order";
    pushItem(
      kind,
      c.kind === "new_order"
        ? "New court order detected"
        : c.kind === "next_hearing_changed"
          ? "Next hearing changed"
          : c.kind === "new_listing"
            ? "New hearing listing"
            : c.kind === "stage_changed"
              ? "Court stage changed"
              : c.kind === "status_changed"
                ? "Case status changed"
                : "Party on the record updated",
      `${c.before ?? "—"} → ${c.after ?? "—"}`,
      [c.source]
    );
  }

  // Contradictions.
  for (const c of ctx.contradictions) {
    pushItem(
      "conflict",
      "Possible inconsistency found",
      `${c.label}: ${c.values.map((v) => v.value).join(" vs ")}`,
      c.values.map((v) => v.source)
    );
  }

  // Pending court direction.
  const pending = ctx.directions.filter((d) => d.compliance === "pending").length;
  if (pending > 0) {
    pushItem(
      "direction",
      "Court direction may still be pending",
      `${pending} direction(s) have no matching completed task.`,
      ctx.directions.slice(0, 3).map((d) => d.source)
    );
  }

  // Authorities.
  if (ctx.authorityCount > 0) {
    pushItem(
      "research",
      `${ctx.authorityCount} relevant authorit${ctx.authorityCount === 1 ? "y" : "ies"} attached`,
      undefined,
      [{ kind: "system", label: "Legal sources on this matter" }]
    );
  }

  // New evidence supporting a fact.
  if (ctx.evidenceSupportCount > 0) {
    pushItem(
      "evidence",
      `New evidence supports ${ctx.evidenceSupportCount} recorded fact(s)`,
      undefined,
      [{ kind: "system", label: "Derived from evidence-to-fact matching" }]
    );
  }

  // Chronology findings.
  for (const f of ctx.chronology.findings.slice(0, 3)) {
    pushItem(f.kind === "date_conflict" ? "conflict" : "missing", f.title, f.detail, f.sources);
  }

  // Missing items.
  for (const m of ctx.missing.slice(0, 3)) {
    pushItem("missing", `Missing: ${m.title}`, m.why, m.sources);
  }

  return items;
}
