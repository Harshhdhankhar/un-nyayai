/* =========================================================================
 * Counterposition Engine — two-sided, grounded reasoning.
 *
 * For each important claim it states YOUR POSITION and a POSSIBLE
 * COUNTERPOSITION, but ONLY where the counterposition is grounded in stored
 * Matter material (a conflicting value on record) or verified research — never
 * invented. It also lists the response material you have and the question that
 * remains unresolved. This is a preparation aid, not a prediction.
 * ========================================================================= */

import type { MatterBundle } from "@/lib/intelligence/inputs";
import type { Contradiction } from "@/lib/intelligence/types";
import { buildClaimEvidenceMatrix } from "./claim-evidence";
import { evidenceFor, documentsFor } from "./util";
import type { Counterposition } from "./types";

export function buildCounterpositions(
  bundle: MatterBundle,
  opts: { contradictions?: Contradiction[] } = {}
): Counterposition[] {
  const rows = buildClaimEvidenceMatrix(bundle, opts);
  const out: Counterposition[] = [];
  let seq = 0;

  for (const row of rows) {
    const evidenceIds = evidenceFor(bundle, row.claim);
    const docIds = documentsFor(bundle, row.claim);

    // Ground a counterposition only in a real conflict on the record.
    let counterposition: string;
    let source: Counterposition["source"] = null;
    let unresolved: string;
    if (row.contradicting.length > 0) {
      counterposition = `A different value is on the record for the same item: ${row.contradicting[0].text}. An opposing party may rely on that value.`;
      source = row.contradicting[0].sources[0] ?? null;
      unresolved = "Which value is accurate must be resolved against the primary documents.";
    } else if (row.supporting.length === 0) {
      counterposition = "This currently rests on recorded facts alone with no independent corroborating source found in the matter. An opposing party may dispute it.";
      source = null;
      unresolved = "Find an independent document, record or witness that corroborates this claim.";
    } else {
      // Corroborated, no conflict: still surface a conservative counterpoint
      // grounded in the gap, without inventing the opponent's case.
      counterposition = "The available record supports this, but it has not been tested against the opposing side's materials (which are not in this workspace).";
      source = null;
      unresolved = "Consider whether the opposing side could present material contradicting this that you have not seen.";
    }

    const responseMaterial =
      evidenceIds.length || docIds.length
        ? `Stored response material: ${[
            ...evidenceIds.map((id) => bundle.evidence.find((e) => e.id === id)?.title).filter(Boolean),
            ...docIds.map((id) => bundle.documents.find((d) => d.id === id)?.name).filter(Boolean),
          ].join(", ")}.`
        : "No independent response material is recorded yet.";

    seq += 1;
    out.push({
      id: `cp-${seq}`,
      position: row.claim,
      counterposition,
      source,
      responseMaterial,
      unresolvedQuestion: unresolved,
    });
  }

  return out;
}
