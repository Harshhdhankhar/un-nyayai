/* =========================================================================
 * Ask The Matter — contextual questions answered from Matter data.
 *
 * Questions like "what are the biggest gaps?", "what changed since last
 * hearing?", "which facts have only one source?" are routed deterministically
 * to the relevant Workbench structure and answered with source refs. No
 * fabricated answers: when nothing matches, we say so plainly.
 * ========================================================================= */

import type { AskResult, CaseReasoning, SourceRef } from "./types";
import { analyzeHearings, explainDelayPattern } from "@/lib/legal/delay-analysis";

const ROUTES: Array<{ re: RegExp; category: AskResult["category"] }> = [
  { re: /gap|missing|weak|unsupported|what do we lack|what (is|are).*(need|missing)/i, category: "gaps" },
  { re: /chang|since|last (check|hearing|time)|new|update|recent/i, category: "changed" },
  { re: /single source|one source|only source|corroborat|independently/i, category: "single_source" },
  { re: /contradict|conflict|inconsisten|disagree|differ/i, category: "contradictions" },
  { re: /evidence|support|prove|proof|backed/i, category: "evidence" },
  { re: /judgment|authorit|case law|legal|section|statute/i, category: "authorities" },
  { re: /direction|pending|must|comply|order|deadline/i, category: "directions" },
  { re: /chronolog|timeline|when|sequence|order of events|what happened/i, category: "chronology" },
  { re: /delay|adjourn|postpon|how long.*pending|stuck/i, category: "delay" },
  { re: /prepare.*hearing|hearing prep|next hearing|how should i prepare|what to expect.*hearing/i, category: "hearing" },
];

export function askMatter(reasoning: CaseReasoning, question: string): AskResult {
  const q = question.trim();
  const matched = ROUTES.find((r) => r.re.test(q));
  const category: AskResult["category"] = matched?.category ?? "unknown";

  const sources: SourceRef[] = [];

  switch (category) {
    case "gaps": {
      const attention = reasoning.preHearing.items.filter((i) => i.status === "NEEDS_ATTENTION" || i.status === "MISSING");
      const missing = reasoning.factLedger.filter((f) => f.status === "MISSING");
      const changeConditions = reasoning.changeConditions;
      let answer =
        attention.length || missing.length
          ? `The biggest gaps are: ${[
              ...attention.map((a) => a.check),
              ...missing.map((m) => `"${m.statement}"`),
            ].slice(0, 6).join("; ")}.`
          : "No significant gaps are currently flagged.";
      if (changeConditions.length) {
        answer += ` Note that the analysis could change: ${changeConditions[0].conditions.slice(0, 2).join("; ")}.`;
      }
      sources.push(...attention.flatMap((a) => a.sources));
      sources.push(...missing.flatMap((m) => m.sources));
      return { question: q, answer, category, sources: dedupeSources(sources) };
    }
    case "changed": {
      const changes = reasoning.postHearing.changes;
      const activity = reasoning.activity.filter((a) => a.kind === "order" || a.kind === "hearing");
      const answer = changes.length
        ? `Since your last check: ${changes.map((c) => `${c.label}: ${c.before ?? "—"} → ${c.after ?? "—"}`).join("; ")}.`
        : activity.length
          ? `Recent activity: ${activity.map((a) => a.title).join("; ")}.`
          : "No changes were detected since the last check.";
      sources.push(...changes.map((c) => c.source));
      sources.push(...activity.flatMap((a) => a.sources));
      return { question: q, answer, category, sources: dedupeSources(sources) };
    }
    case "single_source": {
      const singles = reasoning.factLedger.filter(
        (f) => f.status === "USER_PROVIDED" && f.sources.every((s) => s.kind === "user")
      );
      const answer = singles.length
        ? `Facts that rest on a single (user-provided) source and lack independent corroboration: ${singles.map((f) => `"${f.statement}"`).join("; ")}.`
        : "Every recorded fact has at least one non-user source, or there are none recorded.";
      sources.push(...singles.flatMap((f) => f.sources));
      return { question: q, answer, category, sources: dedupeSources(sources) };
    }
    case "contradictions": {
      const dateConflicts = reasoning.chronology.findings.filter((f) => f.kind === "date_conflict");
      const ledgerConflicts = reasoning.factLedger.filter((f) => f.status === "CONFLICTING");
      const answer =
        dateConflicts.length || ledgerConflicts.length
          ? `${dateConflicts.length + ledgerConflicts.length} contradiction(s) detected: ${[
              ...dateConflicts.map((c) => c.title),
              ...ledgerConflicts.map((f) => `"${f.statement}"`),
            ].slice(0, 6).join("; ")}. None is resolved automatically.`
          : "No contradictions were detected in the stored data.";
      sources.push(...dateConflicts.flatMap((c) => c.sources));
      sources.push(...ledgerConflicts.flatMap((f) => f.conflictingSources));
      return { question: q, answer, category, sources: dedupeSources(sources) };
    }
    case "evidence": {
      const limited = reasoning.claimMatrix.filter((r) => r.coverage === "limited");
      const strong = reasoning.claimMatrix.filter((r) => r.coverage === "strong");
      const answer =
        limited.length || strong.length
          ? `${strong.length} claim(s) have strong source coverage. ${limited.length} claim(s) have limited coverage and need corroborating material: ${limited.map((r) => `"${r.claim.slice(0, 70)}"`).join("; ")}.`
          : "No claims were assessed for evidence coverage.";
      sources.push(...limited.flatMap((r) => r.contradicting.flatMap((c) => c.sources)));
      return { question: q, answer, category, sources: dedupeSources(sources) };
    }
    case "authorities": {
      const matches = reasoning.authorityMatches;
      const answer = matches.length
        ? `Authorities matched to issues: ${[...new Set(matches.map((m) => m.title))].slice(0, 8).join("; ")}.`
        : "No legal authorities are attached to any issue yet.";
      sources.push(...matches.map((m) => m.source));
      return { question: q, answer, category, sources: dedupeSources(sources) };
    }
    case "directions": {
      const pending = reasoning.snapshot.pendingDirections;
      const answer = pending.length
        ? `Pending court directions: ${pending.map((p) => `"${p.slice(0, 80)}"`).join("; ")}.`
        : "No pending court directions were detected.";
      sources.push(...reasoning.actions.filter((a) => a.type === "reply").flatMap((a) => a.sources));
      return { question: q, answer, category, sources: dedupeSources(sources) };
    }
    case "chronology": {
      const events = reasoning.chronology.events;
      const answer = events.length
        ? `Chronology (${events.length} events): ${events.slice(0, 12).map((e) => `${e.date ?? "undated"} — ${e.label}`).join("; ")}.`
        : "No chronology events are recorded yet.";
      sources.push(...events.slice(0, 12).map((e) => e.source));
      return { question: q, answer, category, sources: dedupeSources(sources) };
    }
    case "delay": {
      const history = reasoning.snapshot.hearingHistory;
      if (!history.length) {
        return { question: q, answer: "No court hearing history is available to analyse delay.", category, sources: [] };
      }
      const analysis = analyzeHearings(
        history.map((h) => ({ hearingDate: h.date, purpose: h.purpose, result: h.result, orderSummary: "" }))
      );
      const pattern = explainDelayPattern(analysis);
      const parts = [
        `${analysis.total} hearing(s), ${analysis.postponed} adjournment(s)`,
        analysis.medianGap != null ? `median gap ${analysis.medianGap} days, longest ${analysis.longestGap} days` : null,
        analysis.timePendingDays != null ? `~${analysis.timePendingDays} days elapsed on the record` : null,
        analysis.byReason["reason unclear"] > 0 ? `${analysis.byReason["reason unclear"]} hearing(s) don't say who caused the delay` : null,
      ].filter(Boolean);
      const answer = [parts.join("; ") + ".", pattern].filter(Boolean).join(" ");
      sources.push({ kind: "ecourts", label: "eCourts — Case history", field: "hearing history" });
      return { question: q, answer, category, sources: dedupeSources(sources) };
    }
    case "hearing": {
      const next = reasoning.snapshot.nextHearing;
      const pending = reasoning.snapshot.pendingDirections;
      const missing = reasoning.snapshot.missingEvidence;
      const parts: string[] = [];
      parts.push(next ? `Next hearing: ${next}.` : "No upcoming hearing date is on record.");
      if (pending.length) parts.push(`Directions to address: ${pending.slice(0, 4).join("; ")}.`);
      if (missing.length) parts.push(`Gaps to consider: ${missing.slice(0, 4).join("; ")}.`);
      const answer = parts.join(" ");
      sources.push(...reasoning.snapshot.pendingDirections.map(() => ({ kind: "ecourts" as const, label: "eCourts — directions", field: "order" })));
      return { question: q, answer, category, sources: dedupeSources(sources) };
    }
    default: {
      return {
        question: q,
        answer:
          "I couldn't map that question to a specific Matter area. Try asking about gaps, what changed, contradictions, evidence, authorities, directions, delay or the chronology.",
        category: "unknown",
        sources: [],
      };
    }
  }
}

function dedupeSources(sources: SourceRef[]): SourceRef[] {
  const seen = new Set<string>();
  return sources.filter((s) => {
    const k = `${s.kind}|${s.label}|${s.field ?? ""}|${s.recordId ?? ""}|${s.passage ?? ""}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
