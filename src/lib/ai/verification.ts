import "server-only";
import type { EvidencePack } from "@/lib/legal/schemas";

export type ClaimStatus = "verified" | "interpretation" | "needs_verification";

export interface VerifiedClaim {
  text: string;
  status: ClaimStatus;
  sourceIds: string[];
  reasoning?: string;
}

/**
 * Deterministic verification of an AI answer against retrieved sources.
 *
 * Honesty is the whole point: an answer is only VERIFIED when it *explicitly*
 * cites a retrieved source by its `[n]` index and that index resolves to a real
 * source in the evidence pack. An answer with no citation is INTERPRETATION —
 * the model's own explanation. An answer that cites an index we cannot resolve
 * (e.g. `[7]` when only 4 sources were retrieved) is NEEDS_VERIFICATION, because
 * it is referencing something we did not actually provide.
 *
 * We deliberately do NOT infer "verified" from loose word overlap between the
 * answer and a source excerpt — that manufactured false VERIFIED badges and is
 * exactly the "present interpretation as verified" failure we must avoid. The
 * LLM is never allowed to self-verify.
 */
export function verifyClaims(
  claims: { text: string; sourceIds?: string[] }[],
  pack: EvidencePack
): VerifiedClaim[] {
  return claims.map((claim) => {
    const { resolved, unresolved } =
      claim.sourceIds && claim.sourceIds.length > 0
        ? partitionExplicitIds(claim.sourceIds, pack)
        : resolveCitations(claim.text, pack);

    if (resolved.length > 0) {
      return {
        text: claim.text,
        status: "verified",
        sourceIds: resolved,
        reasoning: `Cites ${resolved.length} retrieved source(s) by reference.`,
      };
    }
    if (unresolved > 0) {
      return {
        text: claim.text,
        status: "needs_verification",
        sourceIds: [],
        reasoning:
          "Cites a source reference that is not in the retrieved evidence pack.",
      };
    }
    return {
      text: claim.text,
      status: "interpretation",
      sourceIds: [],
      reasoning:
        "Explanation based on retrieved material; no specific source is cited.",
    };
  });
}

/** Split caller-provided source ids into those present / absent from the pack. */
function partitionExplicitIds(
  sourceIds: string[],
  pack: EvidencePack
): { resolved: string[]; unresolved: number } {
  const present = new Set(pack.sources.map((s) => s.id));
  const resolved = [...new Set(sourceIds.filter((id) => present.has(id)))];
  const unresolved = sourceIds.filter((id) => !present.has(id)).length;
  return { resolved, unresolved };
}

/**
 * Parse explicit `[n]` / `[n, m]` citation markers from answer text.
 * Returns the resolved source ids and a count of numeric references that point
 * outside the evidence pack (out-of-range citations).
 */
function resolveCitations(
  text: string,
  pack: EvidencePack
): { resolved: string[]; unresolved: number } {
  const byIndex = new Map(pack.sources.map((s, i) => [String(i + 1), s.id]));
  const resolved: string[] = [];
  let unresolved = 0;
  const refs = text.match(/\[(\d+(?:\s*,\s*\d+)*)\]/g) ?? [];
  for (const ref of refs) {
    const indices = ref.replace(/[[\]]/g, "").split(",").map((s) => s.trim());
    for (const idx of indices) {
      if (!/^\d+$/.test(idx)) continue;
      const id = byIndex.get(idx);
      if (id) resolved.push(id);
      else unresolved += 1;
    }
  }
  return { resolved: [...new Set(resolved)], unresolved };
}

/** Wrap a plain-language answer with inline source references (deterministic). */
export function attachSourceFooter(
  markdown: string,
  pack: EvidencePack
): string {
  if (pack.sources.length === 0) return markdown;
  const lines = pack.sources.map(
    (s, i) =>
      `${i + 1}. **${s.title}**` +
      (s.authority ? ` — ${s.authority}` : "") +
      (s.date ? ` (${s.date})` : "") +
      (s.url ? ` [source](${s.url})` : "")
  );
  return `${markdown}\n\n---\n\n**Sources**\n${lines.join("\n")}`;
}
