import "server-only";
import { getMatterDetail } from "@/lib/matters/service";
import { getLatestPair } from "./case-store";
import { getCostInput } from "./cost-store";
import { diffSnapshots } from "./snapshots";
import { analyseCourtOrders } from "./court-orders";
import { detectContradictions } from "./contradictions";
import { detectMissing } from "./missing";
import { explainReadiness } from "./readiness-explain";
import { buildDelayPattern, computeCostOfDelay } from "./delay";
import { buildMatterGraph } from "./graph";
import { deriveMatterState, type MatterStateDerivation } from "./matter-state";
import type {
  CourtDirection,
  IntelligenceItem,
  IntelligenceSection,
  MatterIntelligence,
} from "./types";
import type { CaseSnapshotData, MatterBundle, OrderText } from "./inputs";

/* =========================================================================
 * Matter Intelligence Engine — deterministic synthesis.
 *
 * ONE database read (getMatterDetail, ownership-enforced) + cached snapshot +
 * stored cost inputs. NO live external API and NO LLM on matter open
 * (Section 24). Every analyzer is deterministic and source-backed; the engine
 * only assembles their output into the "what changed / needs attention / is
 * missing / may conflict / court requires / research / prepare next" summary,
 * including a section only when it has real content (Section 1).
 * ========================================================================= */

const HEADINGS: Record<IntelligenceSection["key"], string> = {
  changed: "Since your last check",
  attention: "Needs attention",
  missing: "Missing information",
  conflict: "Possible conflicts",
  court: "The court requires",
  research: "Relevant research",
  prepare: "Prepare next",
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function truncate(s: string, max = 140): string {
  const t = s.trim().replace(/\s+/g, " ");
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Collect order-bearing text from uploaded court orders + the cached case. */
function assembleOrderTexts(bundle: MatterBundle, snapshot: CaseSnapshotData | null): OrderText[] {
  const orders: OrderText[] = [];
  for (const d of bundle.documents) {
    if (d.kind === "court_order" && d.extractedText) {
      orders.push({ text: d.extractedText, date: null, origin: "document", label: d.name, recordId: d.id });
    }
  }
  if (snapshot) {
    for (const o of snapshot.orders) {
      orders.push({
        text: o.summary,
        date: o.orderDate,
        origin: "ecourts",
        label: `eCourts — Order ${o.orderDate}`,
        recordId: snapshot.cnr,
      });
    }
    for (const h of snapshot.history) {
      if (h.orderSummary && h.orderSummary.trim()) {
        orders.push({
          text: h.orderSummary,
          date: h.hearingDate,
          origin: "ecourts",
          label: `eCourts — Hearing ${h.hearingDate}`,
          recordId: snapshot.cnr,
        });
      }
    }
  }
  return orders;
}

function complianceLabel(c: CourtDirection["compliance"]): string {
  if (c === "possibly_done") return "may be addressed";
  if (c === "pending") return "appears pending";
  return "status unclear";
}

export interface MatterIntelligenceResult extends MatterIntelligence {
  /** Extra structured payloads consumed by contextual panels. */
  readinessDimensions: ReturnType<typeof explainReadiness>["dimensions"];
  contradictionCount: number;
  directionCount: number;
  /** High-level product state derived deterministically. */
  matterState: MatterStateDerivation;
}

export async function buildMatterIntelligence(
  userId: string,
  matterId: string
): Promise<MatterIntelligenceResult | null> {
  const detail = await getMatterDetail(userId, matterId);
  if (!detail) return null;
  const bundle = detail as unknown as MatterBundle;

  const { current, previous } = await getLatestPair(matterId);
  const changes = current ? diffSnapshots(previous, current) : [];
  const orders = assembleOrderTexts(bundle, current);
  const directions = analyseCourtOrders(orders, bundle.tasks);
  const contradictions = detectContradictions(bundle, current);
  const missing = detectMissing(bundle);
  const readiness = explainReadiness(bundle, { directions });

  const base = `/app/matters/${matterId}`;
  const sections: IntelligenceSection[] = [];
  const push = (key: IntelligenceSection["key"], items: IntelligenceItem[]) => {
    if (items.length > 0) sections.push({ key, title: HEADINGS[key], items });
  };

  // Changed --------------------------------------------------------------
  push(
    "changed",
    changes.map((c, i) => ({
      id: `chg-${i}`,
      title: c.label,
      detail: `${c.before ?? "—"} → ${c.after ?? "—"}`,
      why: "Detected by comparing your two most recent case checks.",
      sources: [c.source],
      href: `${base}/case`,
    }))
  );

  // Needs attention ------------------------------------------------------
  const attention: IntelligenceItem[] = [];
  const today = todayISO();
  if (current?.nextHearingDate) {
    attention.push({
      id: "att-hearing",
      title: `Next hearing on ${current.nextHearingDate}`,
      detail: current.nextHearingDate >= today ? "Upcoming." : "Date has passed — confirm the new date.",
      why: "Taken from the official eCourts record for this matter.",
      sources: [{ kind: "ecourts", label: "eCourts — Case record", field: "next_hearing_date", recordId: current.cnr, retrievedAt: current.capturedAt }],
      href: `${base}/hearings`,
    });
  }
  const nearestDir = directions
    .filter((d) => d.deadline?.dueDate && d.compliance !== "possibly_done")
    .sort((a, b) => (a.deadline!.dueDate! < b.deadline!.dueDate! ? -1 : 1))[0];
  if (nearestDir) {
    attention.push({
      id: "att-deadline",
      title: `Possible deadline: ${truncate(nearestDir.text, 80)}`,
      detail: nearestDir.deadline!.dueDate ? `Around ${nearestDir.deadline!.dueDate}` : undefined,
      why: nearestDir.deadline!.basis,
      status: "NEEDS_VERIFICATION",
      sources: [nearestDir.source],
      href: `${base}/case`,
    });
  }
  for (const t of bundle.tasks) {
    if (t.status !== "done" && t.dueDate) {
      attention.push({
        id: `att-task-${t.id}`,
        title: `Task due ${t.dueDate}: ${truncate(t.title, 70)}`,
        why: "An open task with a target date on this matter.",
        sources: [{ kind: "user", label: "Your task", recordId: t.id }],
      });
    }
  }
  push("attention", attention.slice(0, 6));

  // Missing --------------------------------------------------------------
  push(
    "missing",
    missing.slice(0, 6).map((m) => ({
      id: m.id,
      title: m.title,
      why: m.why,
      sources: m.sources,
      status: "NEEDS_VERIFICATION" as const,
      href: `${base}/evidence`,
    }))
  );

  // Conflicts ------------------------------------------------------------
  push(
    "conflict",
    contradictions.map((c) => ({
      id: c.id,
      title: c.label,
      detail: c.values.map((v) => v.value).join("  vs  "),
      why: c.note,
      status: "NEEDS_VERIFICATION" as const,
      sources: c.values.map((v) => v.source),
    }))
  );

  // Court requires -------------------------------------------------------
  push(
    "court",
    directions.slice(0, 8).map((d) => ({
      id: d.id,
      title: truncate(d.text, 140),
      detail: [
        d.addressee ? `Addressed to: ${d.addressee}` : null,
        `Compliance ${complianceLabel(d.compliance)}`,
        d.deadline?.dueDate ? `Possible due date ${d.deadline.dueDate}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      why: d.deadline?.basis ?? "Read from the court order text; confirm the exact wording in the order.",
      status: "NEEDS_VERIFICATION" as const,
      sources: [d.source],
      href: `${base}/case`,
    }))
  );

  // Research -------------------------------------------------------------
  const authorities = bundle.sources.filter((s) => s.type === "judgment" || Boolean(s.url));
  push(
    "research",
    authorities.slice(0, 5).map((s) => ({
      id: `res-${s.id}`,
      title: s.title,
      detail: s.citation ?? s.authority ?? undefined,
      why: "Linked to this matter as a legal authority.",
      sources: [
        s.url
          ? { kind: "indian_kanoon" as const, label: s.title, url: s.url }
          : { kind: "verified_rule" as const, label: s.title, field: s.citation ?? undefined },
      ],
      href: `${base}/research`,
    }))
  );

  // Prepare next ---------------------------------------------------------
  const prepare: IntelligenceItem[] = [];
  if (bundle.nextAction && bundle.nextAction.trim()) {
    prepare.push({
      id: "prep-next",
      title: bundle.nextAction,
      why: "Recorded as the next action for this matter.",
      sources: [{ kind: "user", label: "Matter next action" }],
    });
  }
  if (current?.nextHearingDate && current.nextHearingDate >= today) {
    prepare.push({
      id: "prep-hearing",
      title: `Prepare for the hearing on ${current.nextHearingDate}`,
      why: "There is an upcoming hearing on the court record.",
      sources: [{ kind: "ecourts", label: "eCourts — Case record", field: "next_hearing_date", recordId: current.cnr }],
      href: `${base}/hearings`,
    });
  }
  push("prepare", prepare);

  // Current position -----------------------------------------------------
  let currentPosition: string;
  if (current && (current.petitioner || current.respondent)) {
    const parties = [current.petitioner, current.respondent].filter(Boolean).join(" vs ");
    const bits = [
      parties,
      current.caseStatus ? `status: ${current.caseStatus}` : null,
      current.stage ? `stage: ${current.stage}` : null,
    ].filter(Boolean);
    currentPosition = bits.join(" — ");
  } else if (bundle.court || bundle.status) {
    currentPosition = `${bundle.title} — ${bundle.status}${bundle.court ? ` at ${bundle.court}` : ""}.`;
  } else {
    currentPosition = "Not enough is recorded yet to state a clear current position.";
  }

  // Next action item -----------------------------------------------------
  const nextAction: IntelligenceItem | null =
    prepare[0] ??
    attention[0] ??
    (missing[0]
      ? { id: missing[0].id, title: missing[0].title, why: missing[0].why, sources: missing[0].sources }
      : null);

  return {
    matterId,
    generatedAt: new Date().toISOString(),
    currentPosition,
    nextAction,
    sections,
    usedCachedCase: Boolean(current),
    readinessDimensions: readiness.dimensions,
    contradictionCount: contradictions.length,
    directionCount: directions.length,
    matterState: deriveMatterState(bundle, current),
  };
}

/**
 * Cost of Delay for a matter — pulls stored user inputs and the appearance
 * count from the cached case history. Returns null when inputs are absent.
 */
export async function buildCostOfDelay(userId: string, matterId: string) {
  const detail = await getMatterDetail(userId, matterId);
  if (!detail) return null;
  const input = await getCostInput(matterId);
  if (!input) return null;
  const { current } = await getLatestPair(matterId);
  const appearances = current ? current.history.length : 0;
  return computeCostOfDelay(input, appearances);
}

/** Delay pattern for a matter, or null when no case snapshot exists. */
export async function buildMatterDelay(userId: string, matterId: string) {
  const detail = await getMatterDetail(userId, matterId);
  if (!detail) return null;
  const { current } = await getLatestPair(matterId);
  if (!current) return null;
  return buildDelayPattern(current);
}

/** On-demand knowledge graph for a matter. */
export async function buildMatterGraphFor(userId: string, matterId: string) {
  const detail = await getMatterDetail(userId, matterId);
  if (!detail) return null;
  return buildMatterGraph(detail as unknown as MatterBundle);
}
