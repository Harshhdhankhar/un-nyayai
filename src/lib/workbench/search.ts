/* =========================================================================
 * Case File Search — one global search inside a Matter.
 *
 * Searches facts, documents, document text, evidence, hearings/orders,
 * timeline, judgments/research, notes and drafts, and groups the results.
 * Matching is token-based keyword overlap (exact, deterministic).
 * ========================================================================= */

import type { MatterBundle } from "@/lib/intelligence/inputs";
import { tokenize } from "./util";
import type { MatterSearchResult, SearchGroup } from "./types";

function score(text: string, kws: Set<string>): number {
  let n = 0;
  for (const k of kws) if (text.toLowerCase().includes(k)) n += 1;
  return n;
}

export function searchMatter(bundle: MatterBundle, query: string): MatterSearchResult {
  const kws = new Set(tokenize(query));
  const groups: SearchGroup[] = [];
  let total = 0;
  const base = `/app/matters/${bundle.id}`;

  const pushGroup = (group: SearchGroup["group"], items: SearchGroup["items"]) => {
    if (items.length === 0) return;
    groups.push({ group, items });
    total += items.length;
  };

  if (kws.size === 0) return { query, groups: [], total: 0 };

  // FACTS
  pushGroup(
    "FACTS",
    bundle.facts
      .map((f) => ({ f, s: score(f.fact, kws) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map(({ f }) => ({
        id: f.id,
        title: f.fact,
        detail: `Kind: ${f.kind} · Source: ${f.source}`,
        href: `${base}/overview`,
      }))
  );

  // DOCUMENTS
  pushGroup(
    "DOCUMENTS",
    bundle.documents
      .map((d) => ({ d, s: score(`${d.name} ${d.summary ?? ""} ${(d.extractedText ?? "").slice(0, 2000)}`, kws) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map(({ d }) => ({ id: d.id, title: d.name, detail: `Kind: ${d.kind}`, href: `${base}/documents` }))
  );

  // EVIDENCE
  pushGroup(
    "EVIDENCE",
    bundle.evidence
      .map((e) => ({ e, s: score(`${e.title} ${e.description ?? ""}`, kws) }))
      .filter((x) => x.s > 0)
      .map(({ e }) => ({ id: e.id, title: e.title, detail: `Status: ${e.status}`, href: `${base}/evidence` }))
  );

  // COURT_RECORD (events from ecourts + orders not in bundle directly; use ecourts-sourced events)
  pushGroup(
    "COURT_RECORD",
    bundle.events
      .filter((e) => e.source === "ecourts")
      .map((e) => ({ e, s: score(`${e.title} ${e.description ?? ""}`, kws) }))
      .filter((x) => x.s > 0)
      .map(({ e }) => ({ id: e.id, title: e.title, detail: e.description ?? undefined, href: `${base}/case` }))
  );

  // TIMELINE
  pushGroup(
    "TIMELINE",
    bundle.events
      .filter((e) => e.source !== "ecourts")
      .map((e) => ({ e, s: score(`${e.title} ${e.description ?? ""} ${e.eventDate ?? ""}`, kws) }))
      .filter((x) => x.s > 0)
      .map(({ e }) => ({ id: e.id, title: e.title, detail: e.eventDate ?? undefined, href: `${base}/timeline` }))
  );

  // RESEARCH (sources / authorities)
  pushGroup(
    "RESEARCH",
    bundle.sources
      .map((s) => ({ s, score: score(`${s.title} ${s.authority ?? ""} ${s.citation ?? ""} ${s.excerpt ?? ""}`, kws) }))
      .filter((x) => x.score > 0)
      .map(({ s }) => ({ id: s.id, title: s.title, detail: s.citation ?? s.authority ?? s.type, href: `${base}/research` }))
  );

  // DRAFTS
  pushGroup(
    "DRAFTS",
    bundle.drafts
      .map((d) => ({ d, s: score(d.title, kws) }))
      .filter((x) => x.s > 0)
      .map(({ d }) => ({ id: d.id, title: d.title, detail: d.kind, href: `${base}/drafts/${d.id}` }))
  );

  // NOTES
  pushGroup(
    "NOTES",
    bundle.notes
      .map((n) => ({ n, s: score(n.body, kws) }))
      .filter((x) => x.s > 0)
      .map(({ n }) => ({ id: n.id, title: n.body.slice(0, 90) + (n.body.length > 90 ? "…" : ""), href: `${base}/overview` }))
  );

  return { query, groups, total };
}
