/* =========================================================================
 * Opposition View — a grounded "how could this be contested?" map.
 *
 * This does NOT invent the opponent's case. It works only from the user's own
 * recorded facts and flags, for each substantive factual claim, whether it
 * currently rests on unverified/uncorroborated ground — because that is exactly
 * where an opposing party can push. Every point is labelled INTERPRETATION and
 * traced to the underlying fact. Nothing is asserted as the opponent's actual
 * position.
 * ========================================================================= */

import type { OppositionPoint, OppositionView, SourceRef } from "./types";
import type { MatterBundle } from "./inputs";
import { userRef } from "./provenance";

/** Does any document or available evidence plausibly corroborate this fact? */
function hasCorroboration(bundle: MatterBundle, factText: string): boolean {
  const words = factText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 5);
  if (words.length === 0) return false;
  const salient = words.slice(0, 8);
  const haystacks: string[] = [
    ...bundle.documents.map((d) => `${d.name} ${d.summary ?? ""} ${(d.extractedText ?? "").slice(0, 2000)}`),
    ...bundle.evidence.filter((e) => e.status === "available").map((e) => `${e.title} ${e.description ?? ""}`),
  ].map((h) => h.toLowerCase());
  return haystacks.some((h) => salient.filter((w) => h.includes(w)).length >= 2);
}

export function buildOppositionView(bundle: MatterBundle): OppositionView {
  const facts = bundle.facts.filter((f) => f.kind !== "missing" && f.fact.trim().length > 12);
  const points: OppositionPoint[] = [];

  for (const f of facts) {
    const ref: SourceRef =
      f.source === "document"
        ? { kind: "document", label: "Uploaded document", passage: f.fact }
        : userRef("Your statement", f.id);
    const corroborated = hasCorroboration(bundle, f.fact);

    if (!corroborated) {
      points.push({
        position: f.fact,
        counterpoint:
          "This currently rests on your account alone. An opposing party can dispute it unless it is corroborated by a document, record or independent witness.",
        needsClarification:
          "Attach or point to something that independently supports this fact (a document, message, receipt or dated record).",
        sources: [ref],
      });
    }
  }

  const note =
    points.length === 0
      ? "Every substantive fact you recorded appears to have some supporting document or evidence. This view still cannot see the opposing party's actual case — treat it as a preparation aid, not a prediction."
      : "These are interpretations of where your case could be contested, based only on which of your facts are not yet corroborated. They are not the opposing party's stated position.";

  return { points, note };
}
