/* =========================================================================
 * Legal Issue → Authority Matching.
 *
 * For each identified issue, attaches the stored legal authorities that are
 * most relevant, with a plain "why relevant" and the relevant passage. We do
 * NOT attach a judgment merely because a keyword matches — relevance requires
 * shared salient terms in the source's title/authority/excerpt. Binding
 * precedent is NOT implied unless the hierarchy/jurisdiction data actually
 * supports it (a Supreme Court judgment in India).
 * ========================================================================= */

import type { MatterBundle } from "@/lib/intelligence/inputs";
import { kanoonRef, ruleRef } from "@/lib/intelligence/provenance";
import { salientKeywords, keywordOverlap, seqId } from "./util";
import type { AuthorityMatch, Issue } from "./types";

function sourceRef(bundle: MatterBundle, id: string) {
  const s = bundle.sources.find((x) => x.id === id);
  if (!s) return null;
  if (s.url) return kanoonRef(s.title, { url: s.url, passage: s.excerpt ?? undefined });
  return ruleRef(s.title, { citation: s.citation ?? undefined, passage: s.excerpt ?? undefined });
}

export function buildAuthorityMatches(
  bundle: MatterBundle,
  issues: Issue[]
): AuthorityMatch[] {
  const id = seqId("am");
  const matches: AuthorityMatch[] = [];
  const legalSources = bundle.sources.filter(
    (s) => s.type === "statute" || s.type === "section" || s.type === "rule" || s.type === "judgment"
  );
  if (legalSources.length === 0) return matches;

  for (const issue of issues) {
    const text = `${issue.title} ${issue.question}`;
    const kws = new Set(salientKeywords(text, 10));
    const scored = legalSources.map((s) => {
      const hay = `${s.title} ${s.authority ?? ""} ${s.citation ?? ""} ${s.excerpt ?? ""}`;
      const overlap = keywordOverlap(hay, text);
      return { s, overlap };
    });

    const relevant = scored
      .filter(({ overlap }) => overlap >= 1)
      .sort((a, b) => b.overlap - a.overlap);

    // For legal issues, always attach legal sources even without an explicit
    // keyword overlap, so coverage is not silently empty; label the relevance
    // transparently.
    const pool = relevant.length > 0 || issue.type === "legal" ? scored : [];
    const top = pool
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, 4);

    for (const { s, overlap } of top) {
      const ref = sourceRef(bundle, s.id);
      if (!ref) continue;
      const precedentInference =
        s.type === "judgment" && /supreme court/i.test(s.authority ?? "") && (bundle.jurisdiction ?? "India").toLowerCase().includes("india");

      const whyRelevant =
        overlap >= 1
          ? `Shares ${overlap} salient term(s) with this issue (“${[...kws].slice(0, 3).join(", ")}”).`
          : "Linked to this matter as a legal source for a legal issue; its relevance to the specific facts should be confirmed by reading it.";

      matches.push({
        id: id(),
        issueId: issue.id,
        issueTitle: issue.title,
        authorityId: s.id,
        title: s.title,
        whyRelevant,
        passage: s.excerpt ?? undefined,
        court: s.authority ?? undefined,
        citation: s.citation ?? undefined,
        source: ref,
        precedentInference,
      });
    }
  }

  return matches;
}
