/* =========================================================================
 * Matter Knowledge Graph (per-matter, computed on demand).
 *
 * Pure & deterministic: turns an already-loaded MatterBundle into a graph of
 * typed nodes and edges. This is NOT the global knowledge_nodes/knowledge_edges
 * navigation graph in the DB — that one is shared legal ontology. This graph is
 * ephemeral, specific to one matter, and every node/edge carries provenance so
 * the UI can always answer "why is this connected?".
 *
 * Nothing here scores, guesses or invents relationships: an edge exists only
 * when a concrete, checkable condition holds (shared name, stored linkage, …).
 * ========================================================================= */

import type {
  GraphEdge,
  GraphNode,
  GraphNodeType,
  MatterGraph,
  ProvenanceStatus,
  SourceRef,
} from "./types";
import type {
  EvidenceRow,
  EventRow,
  FactRow,
  MatterBundle,
  PartyRow,
  SourceRow,
  TaskRow,
} from "./inputs";
import { factStatus, fromVerificationStatus, userRef } from "./provenance";
import { normalizeName } from "./extract";

function eventStatus(source: string): ProvenanceStatus {
  if (source === "ecourts") return "VERIFIED";
  if (source === "document") return "EXTRACTED";
  if (source === "ai") return "INTERPRETATION";
  return "USER_PROVIDED";
}

function evidenceStatus(status: string): ProvenanceStatus {
  if (status === "available") return "USER_PROVIDED";
  return "NEEDS_VERIFICATION";
}

function factRef(fact: FactRow): SourceRef {
  if (fact.source === "ecourts") return { kind: "ecourts", label: "eCourts — Case record", field: "fact" };
  if (fact.source === "document") return { kind: "document", label: "Uploaded document", passage: fact.fact };
  return userRef("Your statement", fact.id);
}

function eventRef(ev: EventRow): SourceRef {
  if (ev.source === "ecourts")
    return { kind: "ecourts", label: "eCourts — Case history", field: "hearing", passage: ev.title };
  if (ev.source === "document")
    return { kind: "document", label: "Uploaded document", passage: ev.title };
  return userRef(`Timeline: ${ev.title}`, ev.id);
}

function sourceRef(s: SourceRow): SourceRef {
  if (s.url) {
    return { kind: "indian_kanoon", label: s.title, url: s.url, field: s.citation ?? undefined };
  }
  if (s.type === "statute" || s.type === "section" || s.type === "rule") {
    return { kind: "verified_rule", label: s.title, field: s.citation ?? undefined };
  }
  return { kind: "system", label: s.title };
}

export function buildMatterGraph(bundle: MatterBundle): MatterGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let edgeSeq = 0;
  const addEdge = (
    from: string,
    to: string,
    type: GraphEdge["type"],
    reason: string,
    sources: SourceRef[]
  ) => {
    edgeSeq += 1;
    edges.push({ id: `e-${edgeSeq}`, from, to, type, reason, sources });
  };

  const matterNodeId = `matter:${bundle.id}`;
  nodes.push({
    id: matterNodeId,
    type: "matter",
    label: bundle.title,
    sources: [userRef("This matter", bundle.id)],
    meta: { matterType: bundle.matterType, status: bundle.status },
  });

  // Parties -------------------------------------------------------------
  const partyIndex: Array<{ node: string; norm: string; row: PartyRow }> = [];
  for (const p of bundle.parties) {
    const nodeId = `party:${p.id}`;
    nodes.push({
      id: nodeId,
      type: "party",
      label: p.name,
      status: "USER_PROVIDED",
      sources: [userRef(`Party: ${p.name}`, p.id)],
      meta: { role: p.role },
    });
    addEdge(nodeId, matterNodeId, "RELATES_TO", `Named party in this matter (role: ${p.role}).`, [
      userRef(`Party: ${p.name}`, p.id),
    ]);
    partyIndex.push({ node: nodeId, norm: normalizeName(p.name), row: p });
  }

  const linkMentions = (fromNode: string, text: string, sources: SourceRef[]) => {
    const norm = normalizeName(text);
    if (!norm) return;
    for (const p of partyIndex) {
      if (p.norm && p.norm.length >= 3 && norm.includes(p.norm)) {
        addEdge(fromNode, p.node, "MENTIONS", `Text references ${p.row.name}.`, sources);
      }
    }
  };

  // Facts ---------------------------------------------------------------
  for (const f of bundle.facts) {
    if (f.kind === "missing") continue; // missing facts are handled by the Missing engine, not the graph
    const nodeId = `fact:${f.id}`;
    const ref = factRef(f);
    nodes.push({
      id: nodeId,
      type: "fact",
      label: truncate(f.fact, 120),
      status: factStatus(f.kind, f.source),
      sources: [ref],
    });
    addEdge(nodeId, matterNodeId, "ABOUT", "Recorded fact for this matter.", [ref]);
    linkMentions(nodeId, f.fact, [ref]);
  }

  // Documents -----------------------------------------------------------
  for (const d of bundle.documents) {
    const nodeId = `document:${d.id}`;
    const ref: SourceRef = { kind: "document", label: d.name, recordId: d.id };
    nodes.push({
      id: nodeId,
      type: "document",
      label: d.name,
      status: "USER_PROVIDED",
      sources: [ref],
      meta: { kind: d.kind, status: d.status },
    });
    addEdge(nodeId, matterNodeId, "ABOUT", `Uploaded document (${humanKind(d.kind)}).`, [ref]);
    if (d.extractedText) linkMentions(nodeId, d.extractedText.slice(0, 4000), [ref]);
  }

  // Evidence ------------------------------------------------------------
  for (const e of bundle.evidence) {
    const nodeId = `evidence:${e.id}`;
    const ref = evidenceRef(e);
    nodes.push({
      id: nodeId,
      type: "evidence",
      label: e.title,
      status: evidenceStatus(e.status),
      sources: [ref],
      meta: { status: e.status, suggested: e.suggested },
    });
    addEdge(nodeId, matterNodeId, "SUPPORTS", `Evidence item (${humanEvidenceStatus(e.status)}).`, [ref]);
    if (e.documentId) {
      addEdge(nodeId, `document:${e.documentId}`, "SOURCED_FROM", "Backed by an uploaded document.", [ref]);
    }
  }

  // Events / hearings ---------------------------------------------------
  for (const ev of bundle.events) {
    const nodeId = `event:${ev.id}`;
    const ref = eventRef(ev);
    const hearingLike = /hearing|listed|next date|posted|adjourn/i.test(`${ev.title} ${ev.description ?? ""}`);
    nodes.push({
      id: nodeId,
      type: hearingLike ? "hearing" : "event",
      label: truncate(ev.title, 120),
      status: eventStatus(ev.source),
      sources: [ref],
      meta: { date: ev.eventDate },
    });
    addEdge(
      nodeId,
      matterNodeId,
      hearingLike ? "SCHEDULES" : "RELATES_TO",
      ev.eventDate ? `Timeline event dated ${ev.eventDate}.` : "Timeline event (date unknown).",
      [ref]
    );
    linkMentions(nodeId, `${ev.title} ${ev.description ?? ""}`, [ref]);
  }

  // Tasks ---------------------------------------------------------------
  for (const t of bundle.tasks) {
    if (t.status === "done") continue; // completed tasks add noise to the live graph
    const nodeId = `task:${t.id}`;
    const ref = userRef(`Task: ${t.title}`, t.id);
    nodes.push({
      id: nodeId,
      type: "task",
      label: truncate(t.title, 120),
      status: "USER_PROVIDED",
      sources: [ref],
      meta: { status: t.status, dueDate: t.dueDate },
    });
    addEdge(matterNodeId, nodeId, "REQUIRES", taskReason(t), [ref]);
  }

  // Legal sources -------------------------------------------------------
  for (const s of bundle.sources) {
    const nodeId = `source:${s.id}`;
    const ref = sourceRef(s);
    nodes.push({
      id: nodeId,
      type: s.type === "judgment" ? "judgment" : "section",
      label: s.title,
      status: fromVerificationStatus(s.status),
      sources: [ref],
      meta: { citation: s.citation, authority: s.authority },
    });
    addEdge(nodeId, matterNodeId, "SUPPORTS", `Legal source (${humanVerification(s.status)}).`, [ref]);
  }

  return { nodes, edges };
}

/** Count nodes of a given type — used for readiness / summaries. */
export function countNodes(graph: MatterGraph, type: GraphNodeType): number {
  return graph.nodes.filter((n) => n.type === type).length;
}

function evidenceRef(e: EvidenceRow): SourceRef {
  if (e.documentId) return { kind: "document", label: e.title, recordId: e.documentId };
  if (e.provenance) return { kind: "system", label: e.title, passage: e.provenance };
  return userRef(`Evidence: ${e.title}`, e.id);
}

function taskReason(t: TaskRow): string {
  if (t.dueDate) return `Open task with a target date of ${t.dueDate}.`;
  return "Open task recorded for this matter.";
}

function truncate(s: string, max: number): string {
  const t = s.trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function humanKind(kind: string): string {
  return kind.replace(/_/g, " ");
}

function humanEvidenceStatus(status: string): string {
  if (status === "available") return "available";
  if (status === "missing") return "not yet collected";
  return "needs verification";
}

function humanVerification(status: string): string {
  if (status === "verified") return "verified";
  if (status === "interpretation") return "interpretation";
  return "needs verification";
}
