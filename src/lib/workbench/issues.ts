/* =========================================================================
 * Issue Tree — identify distinct legal/factual issues in a Matter.
 *
 * Deterministic, source-backed clustering. The coverage status describes
 * INFORMATION COVERAGE (is there evidence / a verified authority?), NEVER a
 * legal conclusion. We do not decide who is right or whether a claim will win.
 * ========================================================================= */

import type { MatterBundle } from "@/lib/intelligence/inputs";
import type { Contradiction } from "@/lib/intelligence/types";
import { userRef, documentRef, systemRef, ruleRef, kanoonRef } from "@/lib/intelligence/provenance";
import {
  evidenceFor,
  hasCorroboration,
  keywordOverlap,
  seqId,
  tokenize,
} from "./util";
import type {
  Issue,
  IssueCoverageStatus,
  IssueTree,
  SourceRef,
} from "./types";

const LEGAL_ISSUE_TEMPLATES: Array<{ re: RegExp; title: string; question: string }> = [
  { re: /deposit|security deposit/i, title: "Recovery of deposit", question: "Is a refundable deposit owed and, if so, has it been returned?" },
  { re: /cheque bounce|cheque dishonour|dishonou?r/i, title: "Cheque dishonour", question: "Was a cheque issued and dishonoured, and is a remedy available?" },
  { re: /termination|dismiss|fired|removed from service|retrench/i, title: "Wrongful termination", question: "Was the employment terminated lawfully, and is a remedy available?" },
  { re: /salary|wages|arrears|gratuity|provident fund|pf/i, title: "Wages / statutory dues", question: "Are any wages or statutory dues outstanding and recoverable?" },
  { re: /eviction|possession|tenant/i, title: "Eviction / possession", question: "Is a party entitled to possession, and on what basis?" },
  { re: /deficiency in service|consumer|deficient service/i, title: "Deficiency in service", question: "Is there a deficiency in service giving rise to a consumer remedy?" },
  { re: /damage|injury|negligence|compensation/i, title: "Damages / compensation", question: "What loss or injury occurred and what compensation is supported by the record?" },
  { re: /custody/i, title: "Custody", question: "What custody arrangement is supported by the record?" },
  { re: /maintenance|alimony|dowry/i, title: "Maintenance / matrimonial relief", question: "Is maintenance or matrimonial relief supported by the record?" },
  { re: /agreement|contract|breach/i, title: "Breach of agreement", question: "Was there a binding agreement and was it breached?" },
  { re: /limitation|time-bar|barred by time/i, title: "Limitation", question: "Is the claim within the applicable period of limitation?" },
];

function factRef(source: string, passage: string, id: string): SourceRef {
  if (source === "ecourts") return { kind: "ecourts", label: "eCourts — Case record", passage };
  if (source === "document") return documentRef("Uploaded document", { passage });
  return userRef("Your statement", id);
}

export function buildIssueTree(
  bundle: MatterBundle,
  opts: { contradictions?: Contradiction[] } = {}
): IssueTree {
  const id = seqId("issue");
  const issues: Issue[] = [];
  const facts = bundle.facts.filter((f) => f.kind !== "missing");

  /* ---------- 1) Factual issues via keyword clustering ---------- */
  if (facts.length > 0) {
    const clusters: Array<{ seed: string; factIds: string[] }> = [];
    for (const f of facts) {
      const kws = new Set(tokenize(f.fact));
      let placed = false;
      for (const c of clusters) {
        let shared = 0;
        for (const k of kws) if (c.seed.split(" ").includes(k)) shared += 1;
        if (shared >= 1 && keywordOverlap(c.seed, f.fact) >= 1) {
          c.factIds.push(f.id);
          placed = true;
          break;
        }
      }
      if (!placed) {
        clusters.push({ seed: f.fact, factIds: [f.id] });
      }
    }

    for (const c of clusters) {
      const clusterFacts = facts.filter((f) => c.factIds.includes(f.id));
      const corroborated = clusterFacts.map((f) => hasCorroboration(bundle, f.fact));
      const corroboratedAny = corroborated.some(Boolean);
      const corroboratedAll = corroborated.every(Boolean);

      // Is any linked fact disputed by a detected contradiction?
      const disputed = (opts.contradictions ?? []).some((con) =>
        clusterFacts.some((f) => {
          const fk = new Set(tokenize(f.fact));
          return con.values.some((v) => {
            const vk = new Set(tokenize(v.value));
            for (const k of vk) if (fk.has(k)) return true;
            return false;
          });
        })
      );

      let coverage: IssueCoverageStatus;
      if (disputed) coverage = "DISPUTED";
      else if (corroboratedAll && corroboratedAny) coverage = "SUPPORTED";
      else if (corroboratedAny) coverage = "PARTIALLY_SUPPORTED";
      else coverage = "MISSING_INFORMATION";

      const sources = clusterFacts.map((f) => factRef(f.source, f.fact, f.id));
      const evidenceIds = [
        ...new Set(clusterFacts.flatMap((f) => evidenceFor(bundle, f.fact))),
      ];
      const seed = clusterFacts[0].fact;

      issues.push({
        id: id(),
        type: "factual",
        title: seed.slice(0, 80) + (seed.length > 80 ? "…" : ""),
        question: `Is it established that "${seed}"?`,
        coverage,
        factIds: c.factIds,
        evidenceIds,
        authorityIds: [],
        gap:
          coverage === "MISSING_INFORMATION"
            ? "Evidence establishing this fact is not yet recorded."
            : coverage === "PARTIALLY_SUPPORTED"
              ? "Part of this issue is not yet corroborated by a document or record."
              : undefined,
        sources,
      });
    }
  }

  /* ---------- 2) Legal issues from description / authorities ---------- */
  const hay = `${bundle.description ?? ""} ${bundle.category} ${bundle.matterType}`;
  const appliedTemplates = new Set<number>();
  for (let i = 0; i < LEGAL_ISSUE_TEMPLATES.length; i++) {
    const t = LEGAL_ISSUE_TEMPLATES[i];
    if (!t.re.test(hay)) continue;
    appliedTemplates.add(i);
    const authorityIds = bundle.sources
      .filter((s) => s.type === "statute" || s.type === "section" || s.type === "rule" || s.type === "judgment")
      .map((s) => s.id);
    const verified = bundle.sources.filter(
      (s) => s.status === "verified" && (s.type === "statute" || s.type === "section" || s.type === "rule" || s.type === "judgment")
    ).length;
    const sources: SourceRef[] = authorityIds.length
      ? bundle.sources
          .filter((s) => authorityIds.includes(s.id))
          .map((s) =>
            s.url
              ? kanoonRef(s.title, { url: s.url, passage: s.excerpt ?? undefined })
              : ruleRef(s.title, { citation: s.citation ?? undefined, passage: s.excerpt ?? undefined })
          )
      : [systemRef("Derived from the recorded situation", `Matched "${t.title}"`)];
    issues.push({
      id: id(),
      type: "legal",
      title: t.title,
      question: t.question,
      coverage: authorityIds.length ? (verified > 0 ? "SUPPORTED" : "NEEDS_RESEARCH") : "NEEDS_RESEARCH",
      factIds: [],
      evidenceIds: [],
      authorityIds,
      gap: verified === 0 ? "No verified authority is linked to this issue yet." : undefined,
      sources,
    });
  }

  /* If nothing matched from templates, derive a generic legal issue when
   * authorities exist, so legal coverage is always surfaced. */
  const legalCount = issues.filter((i) => i.type === "legal").length;
  if (legalCount === 0 && bundle.sources.length > 0) {
    const verified = bundle.sources.filter((s) => s.status === "verified").length;
    const authorityIds = bundle.sources.map((s) => s.id);
    issues.push({
      id: id(),
      type: "legal",
      title: "Applicable legal position",
      question: "Which law applies to this matter and what does it require?",
      coverage: verified > 0 ? "SUPPORTED" : "NEEDS_RESEARCH",
      factIds: [],
      evidenceIds: [],
      authorityIds,
      gap: verified === 0 ? "No verified authority is linked to this issue yet." : undefined,
      sources: [systemRef("Derived from attached legal sources", `${authorityIds.length} source(s)`)],
    });
  }

  return { issues };
}
