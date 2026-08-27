/* =========================================================================
 * Claim–Evidence Matrix.
 *
 * For each substantive claim, lists what supports it, what contradicts it,
 * what is missing, and a SOURCE COVERAGE tier (strong / moderate / limited)
 * with a plain explanation. The tier describes how well the claim is grounded
 * in stored sources — it is NEVER called "legally sufficient".
 * ========================================================================= */

import type { MatterBundle } from "@/lib/intelligence/inputs";
import type { Claim, Contradiction } from "@/lib/intelligence/types";
import { claim } from "@/lib/intelligence/provenance";
import { hasCorroboration, evidenceFor, documentsFor, tokenize } from "./util";
import type { ClaimEvidenceRow, SourceCoverageTier } from "./types";

export function buildClaimEvidenceMatrix(
  bundle: MatterBundle,
  opts: { contradictions?: Contradiction[] } = {}
): ClaimEvidenceRow[] {
  const contradictions = opts.contradictions ?? [];
  const rows: ClaimEvidenceRow[] = [];
  let seq = 0;

  for (const fact of bundle.facts) {
    if (fact.kind === "missing" || fact.fact.trim().length < 12) continue;

    const supporting: Claim[] = [];
    const docIds = documentsFor(bundle, fact.fact);
    const evIds = evidenceFor(bundle, fact.fact);
    for (const did of docIds) {
      const d = bundle.documents.find((x) => x.id === did);
      if (d)
        supporting.push(
          claim(
            `Document: ${d.name}`,
            d.status === "analyzed" ? "EXTRACTED" : "NEEDS_VERIFICATION",
            [{ kind: "document", label: d.name, recordId: d.id }]
          )
        );
    }
    for (const eid of evIds) {
      const e = bundle.evidence.find((x) => x.id === eid);
      if (e)
        supporting.push(
          claim(
            `Evidence: ${e.title}`,
            e.status === "available" ? "USER_PROVIDED" : "NEEDS_VERIFICATION",
            [{ kind: "user", label: `Evidence: ${e.title}`, recordId: e.id }]
          )
        );
    }
    // De-dupe.
    const seen = new Set<string>();
    const dedupedSupport = supporting.filter((c) => {
      const k = c.text.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    // Contradicting: different values for the same context.
    const fk = new Set(tokenize(fact.fact));
    const contradicting: Claim[] = [];
    for (const con of contradictions) {
      const otherValues = con.values.filter((v) => {
        const vk = new Set(tokenize(v.value));
        for (const k of vk) if (fk.has(k)) return true;
        return false;
      });
      if (otherValues.length > 0) {
        contradicting.push(
          claim(
            `${con.label}: ${otherValues.map((v) => v.value).join(" or ")}`,
            "NEEDS_VERIFICATION",
            otherValues.map((v) => v.source)
          )
        );
      }
    }

    const corroborated = hasCorroboration(bundle, fact.fact);
    const missing: string[] = [];
    if (!corroborated)
      missing.push("An independent document, record or witness that corroborates this claim.");
    if (contradicting.length > 0) missing.push("Resolution of the conflicting values above.");

    let coverage: SourceCoverageTier;
    let coverageReason: string;
    if (corroborated && contradicting.length === 0) {
      coverage = "strong";
      coverageReason = `Backed by ${dedupedSupport.length} stored source(s) with no detected contradiction.`;
    } else if (corroborated && contradicting.length > 0) {
      coverage = "moderate";
      coverageReason = "Supported by stored sources but a conflicting value was also detected and is unresolved.";
    } else {
      coverage = "limited";
      coverageReason = "Rests on recorded facts without an independent corroborating source found in this matter.";
    }

    seq += 1;
    rows.push({
      id: `ce-${seq}`,
      claim: fact.fact,
      supporting: dedupedSupport,
      contradicting,
      missing,
      coverage,
      coverageReason,
    });
  }

  return rows;
}
