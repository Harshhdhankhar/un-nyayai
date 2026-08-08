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
 * Deterministic verification of AI claims against retrieved sources.
 * A claim is VERIFIED when it cites (by [n] or key phrase) a source in the
 * evidence pack. Everything else is INTERPRETATION or NEEDS VERIFICATION.
 * The LLM is never allowed to self-verify.
 */
export function verifyClaims(
  claims: { text: string; sourceIds?: string[] }[],
  pack: EvidencePack
): VerifiedClaim[] {
  return claims.map((claim) => {
    const sourceIds = claim.sourceIds ?? extractSourceRefs(claim.text, pack);
    if (sourceIds.length === 0) {
      return {
        text: claim.text,
        status: "interpretation",
        sourceIds: [],
        reasoning: "No retrieved source is cited for this claim.",
      };
    }
    const matched = sourceIds.filter((id) => pack.sources.some((s) => s.id === id));
    if (matched.length > 0) {
      return {
        text: claim.text,
        status: "verified",
        sourceIds: matched,
        reasoning: `Supported by ${matched.length} retrieved source(s).`,
      };
    }
    return {
      text: claim.text,
      status: "needs_verification",
      sourceIds: [],
      reasoning: "Referenced sources were not found in the evidence pack.",
    };
  });
}

function extractSourceRefs(text: string, pack: EvidencePack): string[] {
  const found: string[] = [];
  const byIndex = new Map(pack.sources.map((s, i) => [String(i + 1), s.id]));
  const refs = text.match(/\[(\d+(?:,\s*\d+)*)\]/g) ?? [];
  for (const ref of refs) {
    const indices = ref.replace(/[\[\]]/g, "").split(",").map((s) => s.trim());
    for (const idx of indices) {
      const id = byIndex.get(idx);
      if (id) found.push(id);
    }
  }
  // Fallback: if the claim text shares a significant noun-phrase with an excerpt.
  if (found.length === 0) {
    const words = new Set(
      text.toLowerCase().split(/\W+/).filter((w) => w.length > 4)
    );
    for (const source of pack.sources) {
      const excerptWords = (source.excerpt ?? "")
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 4);
      const shared = [...words].filter((w) => excerptWords.includes(w));
      if (shared.length >= 3) {
        found.push(source.id);
      }
    }
  }
  return [...new Set(found)];
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
