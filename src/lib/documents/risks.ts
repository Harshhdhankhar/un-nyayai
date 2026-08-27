/**
 * Deterministic legal-risk rules over extracted clauses.
 *
 * Every rule uses hedged, non-conclusive language ("may", "potential
 * concern") — the system never declares something illegal. LLM reasoning
 * adds on top of these rules in the analyzer pipeline.
 */
import type { ExtractedClause, RiskFinding } from "./types";

interface RiskRule {
  id: string;
  patterns: RegExp[];
  level: RiskFinding["level"];
  whyItMatters: string;
  favors: string;
  consequence: string;
  suggestedAction: string;
}

const RULES: RiskRule[] = [
  {
    id: "forfeiture",
    patterns: [/forfeit/i, /no\s+refund\b/i, /shall\s+not\s+be\s+refund/i],
    level: "HIGH",
    whyItMatters:
      "This clause appears to allow money already paid to be kept without refund in some situations.",
    favors: "The party drafting the agreement (typically)",
    consequence:
      "You could lose a deposit or advance even for minor breaches, depending on how the clause is worded.",
    suggestedAction:
      "Ask for the forfeiture conditions to be narrowed to proven material breaches, and confirm any refund timeline in writing.",
  },
  {
    id: "penalty",
    patterns: [/\bpenalt/i, /\bfine\s+of\b/i, /\bliquidated\s+damages\b/i],
    level: "MEDIUM",
    whyItMatters: "A monetary penalty is triggered by defined events such as delay or breach.",
    favors: "The party entitled to impose it (typically the drafter)",
    consequence:
      "You may owe amounts disproportionate to the actual loss if the trigger is broad.",
    suggestedAction:
      "Check that penalty amounts are proportionate and capped, and note what events trigger them.",
  },
  {
    id: "sole-discretion",
    patterns: [/sole\s+discretion/i, /\bsolely\s+at\s+its\s+discretion/i, /\bas\s+it\s+deems\s+fit\b/i],
    level: "MEDIUM",
    whyItMatters:
      "One party can make a decision unilaterally without needing your consent or a stated standard.",
    favors: "The party holding the discretion",
    consequence: "Outcomes may be unpredictable and hard to challenge later.",
    suggestedAction:
      "Consider requesting an objective standard (e.g., 'acting reasonably') instead of unfettered discretion.",
  },
  {
    id: "unilateral-termination",
    patterns: [
      /may\s+terminate\s+(?:this\s+agreement\s+)?at\s+any\s+time\b/i,
      /terminate\s+without\s+cause/i,
      /terminate\s+forthwith\b/i,
    ],
    level: "MEDIUM",
    whyItMatters: "This clause appears to let one side end the agreement at will.",
    favors: "The party given the termination right",
    consequence:
      "You may have little security of tenure or income if the other party ends it abruptly.",
    suggestedAction:
      "Check whether you have the same right, and whether notice or compensation applies to both sides equally.",
  },
  {
    id: "one-sided-jurisdiction",
    patterns: [/exclusive\s+jurisdiction/i, /courts?\s+at\s+[A-Z][a-z]+/],
    level: "LOW",
    whyItMatters: "Disputes must be litigated in one specified city's courts.",
    favors: "Whoever is based in or benefits from that city",
    consequence:
      "If that city is far from you, enforcing your rights becomes costlier.",
    suggestedAction:
      "Confirm the chosen venue is practical for you before signing.",
  },
  {
    id: "broad-indemnity",
    patterns: [/(?:shall|will|agrees?\s+to)\s+indemnify\s+and\s+hold\s+harmless/i, /keep\s+.*indemnified\b/i],
    level: "MEDIUM",
    whyItMatters:
      "You may cover losses of the other party arising from a wide range of events.",
    favors: "The indemnified party (typically the drafter)",
    consequence: "Unlimited or uncapped indemnity can expose you to open-ended liability.",
    suggestedAction:
      "Consider asking for the indemnity to be mutual, limited to direct losses, or capped.",
  },
  {
    id: "lock-in",
    patterns: [/lock-?in\s+period/i],
    level: "MEDIUM",
    whyItMatters:
      "A lock-in restricts exiting (or requires payment) for an initial period.",
    favors: "The party benefiting from continuity (e.g., landlord/employer)",
    consequence:
      "Early exit during the lock-in may forfeit deposits or attract penalties.",
    suggestedAction:
      "Note the exact lock-in duration and its financial consequences before committing.",
  },
  {
    id: "auto-renewal",
    patterns: [/automatically\s+renew/i, /auto-?renew/i, /deemed\s+to\s+be\s+renewed/i],
    level: "LOW",
    whyItMatters: "The agreement continues by default unless actively cancelled.",
    favors: "Either party, depending on exit terms",
    consequence: "Terms may roll over without renegotiation; missing a cancellation window extends obligations.",
    suggestedAction: "Diarise the cancellation window well ahead of renewal.",
  },
  {
    id: "interest-heavy",
    patterns: [/interest\s+@\s?\d+%/i, /interest\s+(?:rate\s+)?of\s+\d+\s?%/i, /compound\s+interest/i],
    level: "MEDIUM",
    whyItMatters: "Interest charges apply to overdue amounts — possibly at a high rate.",
    favors: "The party receiving payment",
    consequence: "Delays can become expensive quickly, especially with compounding.",
    suggestedAction: "Check the rate, whether it compounds, and compare with market norms.",
  },
  {
    id: "unlimited-liability",
    patterns: [/unlimited\s+liabilit/i, /without\s+limit(?:ation)?\s+of\s+liabilit/i, /all\s+losses\s+and\s+damages/i],
    level: "HIGH",
    whyItMatters: "Liability under this clause does not appear to be capped.",
    favors: "The party claiming damages",
    consequence: "Exposure is potentially open-ended if something goes wrong.",
    suggestedAction: "Consider negotiating a liability cap tied to fees or contract value.",
  },
];

/** Run all deterministic rules over clauses. */
export function ruleRisks(clauses: ExtractedClause[]): RiskFinding[] {
  const findings: RiskFinding[] = [];
  for (const clause of clauses) {
    for (const rule of RULES) {
      if (!rule.patterns.some((p) => p.test(clause.text))) continue;
      findings.push({
        clauseTitle: clause.title,
        clauseExcerpt: clause.text.slice(0, 280),
        page: clause.page,
        level: rule.level,
        whatItSays: `The "${clause.title}" clause contains language about ${rule.id.replace(/-/g, " ")}.`,
        whyItMatters: rule.whyItMatters,
        favors: rule.favors,
        consequence: rule.consequence,
        suggestedAction: rule.suggestedAction,
        source: "rule",
      });
      break; // one rule finding per clause keeps the report focused
    }
  }
  return findings;
}

/** Highest severity present in a list of findings. */
export function maxSeverity(levels: string[]): "low" | "medium" | "high" | "critical" {
  if (levels.some((l) => l === "CRITICAL")) return "critical";
  if (levels.some((l) => l === "HIGH")) return "high";
  if (levels.some((l) => l === "MEDIUM")) return "medium";
  return "low";
}
