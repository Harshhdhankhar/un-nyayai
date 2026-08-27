import "server-only";
import { getMatterDetail } from "@/lib/matters/service";
import { getLatestPair } from "@/lib/intelligence/case-store";
import { diffSnapshots } from "@/lib/intelligence/snapshots";
import { detectContradictions } from "@/lib/intelligence/contradictions";
import { analyseCourtOrders } from "@/lib/intelligence/court-orders";
import { suggestTasks } from "@/lib/intelligence/smart-tasks";
import { buildEntityLedger } from "@/lib/intelligence/entities";
import { detectMissing } from "@/lib/intelligence/missing";
import type { MatterBundle, OrderText, CaseSnapshotData } from "@/lib/intelligence/inputs";
import { buildIssueTree } from "./issues";
import { buildFactLedger } from "./fact-ledger";
import { buildClaimEvidenceMatrix } from "./claim-evidence";
import { buildChronology } from "./chronology";
import { buildCounterpositions } from "./counterposition";
import { buildChangeConditions } from "./change-analysis";
import { buildSourceCoverage } from "./source-coverage";
import { buildAuthorityMatches } from "./authority";
import { buildSmartActions } from "./actions";
import { buildActivityFeed } from "./activity";
import { buildPreHearingCheck } from "./prehearing";
import { buildMatterSnapshot } from "./snapshot";
import { buildPostHearingUpdate } from "./posthearing";
import { evidenceFor, documentsFor, keywordOverlap, salientKeywords } from "./util";
import type {
  CaseReasoning,
  Counterposition,
  Issue,
  TheoryNode,
} from "./types";

/* =========================================================================
 * Case Reasoning assembler — ONE ownership-enforced DB read + cached snapshot,
 * NO live external API and NO LLM on matter open. Every analyzer is
 * deterministic and source-backed; this file only assembles their output into
 * the Case Theory Map and companion structures (Sections 1, 25).
 * ========================================================================= */

export function assembleOrderTexts(bundle: MatterBundle, snapshot: CaseSnapshotData | null): OrderText[] {
  const orders: OrderText[] = [];
  for (const d of bundle.documents) {
    if (d.kind === "court_order" && d.extractedText)
      orders.push({ text: d.extractedText, date: null, origin: "document", label: d.name, recordId: d.id });
  }
  if (snapshot) {
    for (const o of snapshot.orders)
      orders.push({ text: o.summary, date: o.orderDate, origin: "ecourts", label: `eCourts — Order ${o.orderDate}`, recordId: snapshot.cnr });
    for (const h of snapshot.history)
      if (h.orderSummary && h.orderSummary.trim())
        orders.push({ text: h.orderSummary, date: h.hearingDate, origin: "ecourts", label: `eCourts — Hearing ${h.hearingDate}`, recordId: snapshot.cnr });
  }
  return orders;
}

function buildCaseTheory(
  bundle: MatterBundle,
  issues: Issue[],
  counterpositions: Counterposition[]
): TheoryNode[] {
  const nodes: TheoryNode[] = [];
  const statusForCoverage = (c: Issue["coverage"]) =>
    c === "SUPPORTED"
      ? "VERIFIED"
      : c === "PARTIALLY_SUPPORTED"
        ? "INTERPRETATION"
        : c === "DISPUTED"
          ? "CONFLICTING"
          : c === "MISSING_INFORMATION"
            ? "MISSING"
            : "UNKNOWN";

  for (const issue of issues) {
    const children: TheoryNode[] = [];

    // CLAIM → FACT → EVIDENCE
    const facts = bundle.facts.filter((f) => issue.factIds.includes(f.id) && f.kind !== "missing");
    if (facts.length > 0) {
      const claimNode: TheoryNode = {
        id: `theory-${issue.id}-claim`,
        kind: "CLAIM",
        label: issue.question,
        status: statusForCoverage(issue.coverage),
        sources: issue.sources,
        children: facts.map((f) => {
          const ev = [
            ...evidenceFor(bundle, f.fact).map((id) => bundle.evidence.find((e) => e.id === id)).filter(Boolean),
            ...documentsFor(bundle, f.fact).map((id) => bundle.documents.find((d) => d.id === id)).filter(Boolean),
          ];
          return {
            id: `theory-${issue.id}-fact-${f.id}`,
            kind: "FACT" as const,
            label: f.fact,
            status: f.kind === "extracted" ? "DOCUMENT_SUPPORTED" : f.source === "ecourts" ? "COURT_RECORD" : "USER_PROVIDED",
            sources: [{ kind: "user", label: "Your statement", recordId: f.id }],
            children: ev.slice(0, 4).map((e) => ({
              id: `theory-${issue.id}-ev-${(e as { id: string }).id}`,
              kind: "EVIDENCE" as const,
              label: (e as { name?: string; title?: string }).name ?? (e as { title?: string }).title ?? "Evidence",
              status: "DOCUMENT_SUPPORTED" as const,
              sources: [{ kind: "document", label: (e as { name?: string; title?: string }).name ?? (e as { title?: string }).title ?? "Evidence", recordId: (e as { id: string }).id }],
            })),
          } as TheoryNode;
        }),
      };
      children.push(claimNode);
    }

    // AUTHORITY
    if (issue.authorityIds.length > 0) {
      children.push({
        id: `theory-${issue.id}-authority`,
        kind: "AUTHORITY",
        label: "Relevant legal authority",
        status: "VERIFIED",
        sources: issue.sources,
        children: bundle.sources.filter((s) => issue.authorityIds.includes(s.id)).slice(0, 5).map((s) => ({
          id: `theory-${issue.id}-auth-${s.id}`,
          kind: "AUTHORITY" as const,
          label: s.title,
          status: "VERIFIED" as const,
          sources: [s.url ? { kind: "indian_kanoon", label: s.title, url: s.url } : { kind: "verified_rule", label: s.title, field: s.citation ?? undefined }],
        })),
      });
    }

    // COUNTERPOINT
    const relevant = counterpositions.filter((cp) => {
      const a = new Set(salientKeywords(cp.position, 8));
      const b = new Set(salientKeywords(issue.question, 8));
      let shared = 0;
      for (const k of a) if (b.has(k)) shared += 1;
      return shared >= 1 || facts.some((f) => keywordOverlap(f.fact, cp.position) >= 1);
    });
    if (relevant.length > 0) {
      children.push({
        id: `theory-${issue.id}-counter`,
        kind: "COUNTERPOINT",
        label: "Possible counterposition",
        status: "INTERPRETATION",
        sources: relevant[0].source ? [relevant[0].source] : [],
        children: relevant.slice(0, 3).map((cp, i) => ({
          id: `theory-${issue.id}-counter-${i}`,
          kind: "COUNTERPOINT" as const,
          label: cp.counterposition,
          status: "INTERPRETATION" as const,
          sources: cp.source ? [cp.source] : [],
        })),
      });
    }

    // GAP
    if (issue.gap) {
      children.push({
        id: `theory-${issue.id}-gap`,
        kind: "GAP",
        label: issue.gap,
        status: "MISSING",
        sources: [],
      });
    }

    nodes.push({
      id: `theory-${issue.id}`,
      kind: "LEGAL_ISSUE",
      label: issue.title,
      status: statusForCoverage(issue.coverage),
      sources: issue.sources,
      children,
    });
  }

  return nodes;
}

export async function buildCaseReasoning(userId: string, matterId: string): Promise<CaseReasoning | null> {
  const detail = await getMatterDetail(userId, matterId);
  if (!detail) return null;
  const bundle = detail as unknown as MatterBundle;

  const { current, previous } = await getLatestPair(matterId);
  const changes = current ? diffSnapshots(previous, current) : [];
  const contradictions = detectContradictions(bundle, current);
  const orders = assembleOrderTexts(bundle, current);
  const directions = analyseCourtOrders(orders, bundle.tasks);
  const missing = detectMissing(bundle);

  const issues = buildIssueTree(bundle, { contradictions }).issues;
  const factLedger = buildFactLedger(bundle, { issues, contradictions });
  const claimMatrix = buildClaimEvidenceMatrix(bundle, { contradictions });
  const chronology = buildChronology(bundle, current);
  const counterpositions = buildCounterpositions(bundle, { contradictions });
  const changeConditions = buildChangeConditions(bundle);
  const sourceCoverage = buildSourceCoverage(bundle, current);
  const authorityMatches = buildAuthorityMatches(bundle, issues);
  const upcomingHearing = current?.nextHearingDate ?? null;

  const actions = buildSmartActions({
    bundle,
    directions,
    missing,
    contradictions,
    chronology,
    issues,
    upcomingHearing,
  });

  const activity = buildActivityFeed({
    changes,
    directions,
    missing,
    contradictions,
    chronology,
    authorityCount: authorityMatches.length,
    evidenceSupportCount: claimMatrix.filter((r) => r.supporting.length > 0).length,
  });

  const snapshot = buildMatterSnapshot({
    bundle,
    issues,
    factLedger,
    directions,
    missing,
    chronology,
    actions,
    nextHearing: upcomingHearing,
    hearingHistory: (current?.history ?? []).map((h) => ({ date: h.hearingDate, purpose: h.purpose ?? "", result: h.result ?? "" })),
  });

  const preHearing = buildPreHearingCheck({
    bundle,
    directions,
    contradictions,
    changes,
    hasSnapshot: Boolean(current),
  });

  const postHearing = buildPostHearingUpdate({ snapshot: current, changes });
  const entities = buildEntityLedger(bundle, orders, bundle.facts.map((f) => f.fact));

  return {
    matterId,
    generatedAt: new Date().toISOString(),
    usedCachedCase: Boolean(current),
    caseTheory: buildCaseTheory(bundle, issues, counterpositions),
    issues,
    factLedger,
    claimMatrix,
    chronology,
    counterpositions,
    changeConditions,
    authorityMatches,
    sourceCoverage,
    actions,
    activity,
    snapshot,
    preHearing,
    postHearing,
    smartTasks: suggestTasks(directions),
    entities,
  };
}
