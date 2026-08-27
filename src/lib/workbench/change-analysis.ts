/* =========================================================================
 * "What Would Change This Analysis?" — anti-overconfidence explainability.
 *
 * For important conclusions we state plainly what could change them, so the
 * product never presents its reading as fixed. Conditions are generated from
 * the actual content of the claim (does it carry an amount / a date / rely on
 * uncorroborated material), not from generic boilerplate.
 * ========================================================================= */

import type { MatterBundle } from "@/lib/intelligence/inputs";
import { extractAmounts, extractDates } from "@/lib/intelligence/extract";
import { hasCorroboration } from "./util";
import type { ChangeCondition } from "./types";

export function buildChangeConditions(bundle: MatterBundle): ChangeCondition[] {
  const out: ChangeCondition[] = [];
  let seq = 0;
  const push = (conclusion: string, conditions: string[], basis: string) => {
    seq += 1;
    out.push({ id: `cc-${seq}`, conclusion, conditions, basis });
  };

  for (const fact of bundle.facts) {
    if (fact.kind === "missing" || fact.fact.trim().length < 12) continue;

    const amounts = extractAmounts(fact.fact);
    const dates = extractDates(fact.fact);
    const corroborated = hasCorroboration(bundle, fact.fact);
    const conditions: string[] = [];

    if (amounts.length > 0) {
      conditions.push(
        "another executed agreement or record states a different amount",
        "payment/transfer records show a different figure than recorded here",
        "an amendment or addendum modifies the amount"
      );
    } else if (dates.length > 0) {
      conditions.push(
        "another dated source places this event on a different date",
        "a document shows the event never occurred on the recorded date"
      );
    } else {
      conditions.push(
        corroborated
          ? "the corroborating document is later shown to be different from what was recorded"
          : "an independent document or record is found that either corroborates or contradicts this"
      );
    }

    if (!corroborated) {
      conditions.push(
        "conflicting evidence is introduced that this fact is inaccurate"
      );
    }

    push(
      `The available information suggests: “${fact.fact}”.`,
      conditions,
      "These conditions are named so the conclusion is not treated as fixed."
    );
  }

  return out;
}
