import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  Activity,
  ListChecks,
  AlertTriangle,
  ShieldQuestion,
  ArrowRight,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { buildCaseReasoning } from "@/lib/workbench/case-reasoning";
import { Panel } from "@/components/workbench/panel";
import { UncertaintyBadge } from "@/components/workbench/uncertainty-badge";
import { SourceRefs } from "@/components/workbench/source-refs";
import { IssueTree } from "@/components/workbench/issue-tree";
import { WorkbenchClient } from "@/components/workbench/workbench-client";
import type {
  CaseReasoning,
  Chronology,
  TheoryNode,
} from "@/lib/workbench/types";
import type { EntityEntry } from "@/lib/intelligence/entities";

export const dynamic = "force-dynamic";

export default async function MatterWorkbenchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return notFound();
  const { id } = await params;
  const reasoning = await buildCaseReasoning(user.id, id);
  if (!reasoning) return notFound();

  return (
    <div className="space-y-5">
      <header className="max-w-3xl">
        <p className="eyebrow text-navy-700">Legal workbench</p>
        <h2 className="mt-2 font-serif-display text-3xl text-navy-950">Case reasoning</h2>
        <p className="mt-2 text-sm leading-6 text-ink-600">
          A structured map of what is claimed, what supports it, what is
          disputed, what law is relevant and what is still missing. Every item
          traces back to its source. This describes information coverage — it
          is not a prediction of outcome.
        </p>
      </header>

      <WorkbenchClient matterId={id} />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <CaseTheoryView reasoning={reasoning} />
          <ChronologyView chronology={reasoning.chronology} />
          <ClaimMatrixView reasoning={reasoning} />
          <CounterpositionsView reasoning={reasoning} />
        </div>
        <div className="space-y-5">
          <ActionsView reasoning={reasoning} />
          <ActivityView reasoning={reasoning} />
          <SourceCoverageView reasoning={reasoning} />
        </div>
      </div>

      <FactLedgerView reasoning={reasoning} />

      <div className="grid gap-5 lg:grid-cols-2">
        <IssuesView reasoning={reasoning} />
        <AuthorityView reasoning={reasoning} />
        <ChangeConditionsView reasoning={reasoning} />
        <PreHearingView reasoning={reasoning} />
      </div>

      <SmartTasksView reasoning={reasoning} />
      <EntitiesView reasoning={reasoning} />
      <PostHearingView reasoning={reasoning} />
      <SnapshotView reasoning={reasoning} />
    </div>
  );
}

/* ------------------------------ case theory ----------------------------- */

function CaseTheoryView({ reasoning }: { reasoning: CaseReasoning }) {
  return (
    <Panel eyebrow="Case theory map" title="How the matter is structured" description="Issue → claim → facts → evidence → authority → counterpoint → gap.">
      {reasoning.caseTheory.length ? (
        <div className="space-y-2">
          {reasoning.caseTheory.map((node) => (
            <TheoryNodeView key={node.id} node={node} depth={0} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink-500">No case theory could be derived from the recorded matter yet.</p>
      )}
    </Panel>
  );
}

function TheoryNodeView({ node, depth }: { node: TheoryNode; depth: number }) {
  const hasChildren = node.children && node.children.length > 0;
  const inner = (
    <div
      className={`flex items-start gap-2 rounded-md border border-ink-200 px-3 py-2 ${depth > 0 ? "bg-ink-50/40" : "bg-white"}`}
    >
      <span className="mt-0.5 shrink-0 rounded bg-ink-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ink-500">
        {node.kind.toLowerCase().replace("_", " ")}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-navy-950">{node.label}</p>
        <SourceRefs sources={node.sources} />
      </div>
      <UncertaintyBadge status={node.status} />
    </div>
  );
  if (!hasChildren) return inner;
  return (
    <div>
      {inner}
      <div className="ml-4 mt-1.5 space-y-1.5 border-l border-ink-200 pl-3">
        {node.children!.map((c) => (
          <TheoryNodeView key={c.id} node={c} depth={depth + 1} />
        ))}
      </div>
    </div>
  );
}

/* -------------------------------- chronology ---------------------------- */

function ChronologyView({ chronology }: { chronology: Chronology }) {
  return (
    <Panel
      eyebrow="Chronology engine"
      title="Reconstructed timeline"
      description="Dates reconstructed from documents, facts, eCourts and records, with missing dates, conflicts, impossible orderings and gaps flagged."
    >
      {chronology.findings.length ? (
        <div className="mb-4 space-y-2">
          {chronology.findings.map((f) => (
            <div key={`${f.kind}-${f.title}`} className="rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2">
              <p className="text-xs font-semibold text-amber-800">
                <ShieldQuestion className="mr-1 inline h-3.5 w-3.5" />
                {f.title}
              </p>
              <p className="mt-0.5 text-xs leading-5 text-amber-800">{f.detail}</p>
              <SourceRefs sources={f.sources} />
            </div>
          ))}
        </div>
      ) : null}
      {chronology.events.length ? (
        <ol className="border-l border-ink-200 pl-4">
          {chronology.events.map((e) => (
            <li key={e.id} className="relative border-b border-ink-100 py-2 last:border-0">
              <span className="absolute -left-[21px] mt-1.5 h-2 w-2 rounded-full bg-navy-800" />
              <div className="flex flex-wrap items-center gap-2">
                <time className="font-mono text-xs text-ink-500">{e.date ? format(new Date(e.date), "d MMM yyyy") : "Undated"}</time>
                <p className="text-sm text-navy-950">{e.label}</p>
                <UncertaintyBadge status={e.status} />
              </div>
              <SourceRefs sources={[e.source]} />
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-ink-500">No chronology events recorded yet.</p>
      )}
    </Panel>
  );
}

/* ---------------------------- claim-evidence ---------------------------- */

function ClaimMatrixView({ reasoning }: { reasoning: CaseReasoning }) {
  const tier = { strong: "bg-verified-100 text-verified-700", moderate: "bg-navy-100 text-navy-800", limited: "bg-critical-100 text-critical-600" };
  if (reasoning.claimMatrix.length === 0)
    return (
      <Panel eyebrow="Claim–evidence matrix" title="What supports each claim">
        <p className="text-sm text-ink-500">No substantive claims recorded to assess.</p>
      </Panel>
    );
  return (
    <Panel eyebrow="Claim–evidence matrix" title="What supports each claim" description="Coverage tiers reflect source coverage, not legal sufficiency.">
      <div className="space-y-3">
        {reasoning.claimMatrix.map((row) => (
          <div key={row.id} className="rounded-lg border border-ink-200 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-navy-950">{row.claim}</p>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tier[row.coverage]}`}>{row.coverage} coverage</span>
            </div>
            <p className="mt-1 text-xs text-ink-500">{row.coverageReason}</p>
            <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
              <div>
                <p className="font-semibold uppercase tracking-wider text-ink-400">Supporting</p>
                <ul className="mt-1 space-y-1 text-ink-700">
                  {row.supporting.length ? row.supporting.map((c, i) => <li key={i}>✓ {c.text}</li>) : <li>—</li>}
                </ul>
              </div>
              <div>
                <p className="font-semibold uppercase tracking-wider text-ink-400">Contradicting</p>
                <ul className="mt-1 space-y-1 text-critical-700">
                  {row.contradicting.length ? row.contradicting.map((c, i) => <li key={i}>⚠ {c.text}</li>) : <li>None detected</li>}
                </ul>
              </div>
              <div>
                <p className="font-semibold uppercase tracking-wider text-ink-400">Missing</p>
                <ul className="mt-1 space-y-1 text-ink-500">
                  {row.missing.length ? row.missing.map((m, i) => <li key={i}>○ {m}</li>) : <li>—</li>}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ----------------------------- counterpositions ------------------------- */

function CounterpositionsView({ reasoning }: { reasoning: CaseReasoning }) {
  if (reasoning.counterpositions.length === 0) return null;
  return (
    <Panel eyebrow="Counterposition engine" title="What the other side might say" description="Grounded in this matter's material and verified research — never invented.">
      <div className="space-y-3">
        {reasoning.counterpositions.map((cp) => (
          <div key={cp.id} className="rounded-lg border border-ink-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-navy-700">Your position</p>
            <p className="mt-1 text-sm text-navy-950">{cp.position}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-critical-600">Possible counterposition</p>
            <p className="mt-1 text-sm leading-6 text-ink-700">{cp.counterposition}</p>
            <p className="mt-2 text-xs text-ink-500">
              <span className="font-semibold text-ink-600">Your response material:</span> {cp.responseMaterial}
            </p>
            <p className="mt-1 text-xs text-ink-500">
              <span className="font-semibold text-ink-600">Unresolved:</span> {cp.unresolvedQuestion}
            </p>
            {cp.source ? <SourceRefs sources={[cp.source]} /> : null}
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ------------------------------ issues view ----------------------------- */

function IssuesView({ reasoning }: { reasoning: CaseReasoning }) {
  return (
    <Panel eyebrow="Issue tree" title="Distinct issues in this matter" description="Coverage statuses describe information coverage, not legal conclusions.">
      <IssueTree issues={reasoning.issues} />
    </Panel>
  );
}

/* ------------------------------- authorities ---------------------------- */

function AuthorityView({ reasoning }: { reasoning: CaseReasoning }) {
  if (reasoning.authorityMatches.length === 0) {
    return (
      <Panel eyebrow="Authority map" title="Legal issue → authority">
        <p className="text-sm text-ink-500">No legal authorities are attached to any issue yet. Research on the Research tab to populate this map.</p>
      </Panel>
    );
  }
  return (
    <Panel eyebrow="Authority map" title="Legal issue → authority">
      <div className="space-y-3">
        {reasoning.authorityMatches.map((m) => (
          <div key={m.id} className="rounded-lg border border-ink-200 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">{m.issueTitle}</p>
            <p className="mt-1 text-sm font-semibold text-navy-950">{m.title}</p>
            <p className="mt-0.5 text-xs text-ink-500">{[m.court, m.date, m.citation].filter(Boolean).join(" · ")}</p>
            <p className="mt-1 text-xs text-ink-600">{m.whyRelevant}</p>
            {m.passage ? <p className="mt-1 line-clamp-2 text-xs italic text-ink-500">“{m.passage}”</p> : null}
            <div className="mt-1.5 flex items-center gap-2">
              <SourceRefs sources={[m.source]} />
              {m.precedentInference ? (
                <span className="rounded bg-verified-100 px-1.5 py-0.5 text-[10px] font-semibold text-verified-700">Supreme Court</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ---------------------------- change conditions ------------------------- */

function ChangeConditionsView({ reasoning }: { reasoning: CaseReasoning }) {
  if (reasoning.changeConditions.length === 0) return null;
  return (
    <Panel eyebrow="What would change this?" title="Anti-overconfidence" description="What could change the current analysis, so it is not treated as fixed.">
      <div className="space-y-3">
        {reasoning.changeConditions.map((c) => (
          <div key={c.id} className="rounded-lg border border-ink-200 p-3">
            <p className="text-sm font-medium text-navy-950">{c.conclusion}</p>
            <ul className="mt-2 space-y-1 text-xs text-ink-600">
              {c.conditions.map((cond, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" />
                  {cond}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ------------------------------ fact ledger ----------------------------- */

function FactLedgerView({ reasoning }: { reasoning: CaseReasoning }) {
  return (
    <Panel eyebrow="Fact ledger" title="Canonical facts" description="The factual foundation used across NyayAI — each fact with its value, date, source and coverage.">
      <div className="grid gap-3 md:grid-cols-2">
        {reasoning.factLedger.map((f) => (
          <div key={f.id} className="rounded-lg border border-ink-200 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-navy-950">{f.statement}</p>
              <UncertaintyBadge status={f.status} />
            </div>
            {(f.value || f.date) && (
              <p className="mt-1 font-mono text-xs text-ink-500">
                {f.value ? `${f.value}` : ""}
                {f.date ? `${f.value ? " · " : ""}${f.date}` : ""}
              </p>
            )}
            <SourceRefs sources={f.sources} />
            {f.conflictingSources.length ? (
              <p className="mt-1.5 text-[11px] text-critical-600">
                Conflicting source(s): {f.conflictingSources.map((c) => c.label).join(", ")}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ------------------------------ smart actions --------------------------- */

function ActionsView({ reasoning }: { reasoning: CaseReasoning }) {
  return (
    <Panel eyebrow="Smart actions" title="What needs doing" description="Each action appears because of a concrete matter condition, and explains why.">
      {reasoning.actions.length ? (
        <ul className="space-y-2">
          {reasoning.actions.map((a) => (
            <li key={a.id} className="rounded-lg border border-ink-200 p-3">
              <div className="flex items-start gap-2">
                <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-navy-700" />
                <div>
                  <p className="text-sm font-semibold text-navy-950">{a.title}</p>
                  <p className="mt-1 text-xs leading-5 text-ink-500">{a.why}</p>
                  <SourceRefs sources={a.sources} />
                </div>
              </div>
              {a.href ? (
                <Link
                  href={a.href}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-navy-800 hover:underline"
                >
                  Go to it <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-500">No actions are currently warranted by the matter state.</p>
      )}
    </Panel>
  );
}

/* ------------------------------ activity feed --------------------------- */

function ActivityView({ reasoning }: { reasoning: CaseReasoning }) {
  return (
    <Panel eyebrow="Activity feed" title="What NyayAI noticed">
      {reasoning.activity.length ? (
        <ul className="space-y-2">
          {reasoning.activity.map((a) => (
            <li key={a.id} className="flex items-start gap-2">
              <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" />
              <div>
                <p className="text-sm text-navy-950">{a.title}</p>
                {a.detail ? <p className="text-xs text-ink-500">{a.detail}</p> : null}
                <SourceRefs sources={a.sources} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-500">No meaningful discoveries yet.</p>
      )}
    </Panel>
  );
}

/* ----------------------------- source coverage -------------------------- */

function SourceCoverageView({ reasoning }: { reasoning: CaseReasoning }) {
  return (
    <Panel eyebrow="Source coverage" title="Where the information comes from" description="Source counts by category and kind.">
      {reasoning.sourceCoverage.length ? (
        <div className="space-y-4">
          {reasoning.sourceCoverage.map((cat) => (
            <div key={cat.category}>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">{cat.category}</p>
              <ul className="mt-2 space-y-1.5">
                {cat.buckets.map((b) => (
                  <li key={b.label} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-ink-700">{b.label}</span>
                    <span className="rounded bg-ink-100 px-2 py-0.5 font-mono text-xs text-ink-600">{b.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink-500">No sources recorded to map yet.</p>
      )}
    </Panel>
  );
}

/* ------------------------------ pre-hearing ----------------------------- */

function PreHearingView({ reasoning }: { reasoning: CaseReasoning }) {
  const overallTone =
    reasoning.preHearing.overall === "READY"
      ? "bg-verified-100 text-verified-700"
      : reasoning.preHearing.overall === "NEEDS_ATTENTION"
        ? "bg-amber-100 text-amber-700"
        : "bg-critical-100 text-critical-600";
  return (
    <Panel eyebrow="Pre-hearing check" title="Readiness before the next hearing" description="An honest checklist, not a percentage.">
      {reasoning.preHearing.overall && (
        <div className="mb-3 flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${overallTone}`}>
            {reasoning.preHearing.overall}
          </span>
          <span className="text-xs text-ink-500">overall (worst item)</span>
        </div>
      )}
      <ul className="space-y-2">
        {reasoning.preHearing.items.map((item) => {
          const tone =
            item.status === "READY"
              ? "text-verified-700"
              : item.status === "NEEDS_ATTENTION"
                ? "text-amber-700"
                : "text-critical-600";
          return (
            <li key={item.id} className="flex items-start gap-2 rounded-lg border border-ink-100 p-2.5">
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full bg-current ${tone}`} />
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${tone}`}>{item.check}</p>
                <p className="text-xs leading-5 text-ink-600">{item.detail}</p>
                <SourceRefs sources={item.sources} />
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/* ------------------------------ smart tasks ----------------------------- */

function EntitiesView({ reasoning }: { reasoning: CaseReasoning }) {
  const { entities } = reasoning;
  const hasAny = entities.amounts.length || entities.dates.length || entities.caseNumbers.length || entities.provisions.length;
  if (!hasAny) return null;
  const sections: Array<{ title: string; items: EntityEntry[] }> = [
    { title: "Amounts", items: entities.amounts },
    { title: "Dates", items: entities.dates },
    { title: "Case numbers", items: entities.caseNumbers },
    { title: "Provisions", items: entities.provisions },
  ];
  return (
    <Panel eyebrow="Normalized entities" title="Key numbers & dates" description="A single ledger of the amounts, dates, case numbers and provisions mentioned across your facts and the court record. Each value is normalized and counts how many sources mention it — verify before relying on it.">
      <div className="grid gap-6 sm:grid-cols-2">
        {sections.map((section) => {
          const items = section.items.slice(0, 8);
          if (items.length === 0) return null;
          return (
            <div key={section.title}>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">{section.title}</p>
              <ul className="mt-2 space-y-1.5">
                {items.map((item, i) => (
                  <li key={i} className="rounded-md border border-ink-100 px-3 py-2">
                    <p className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm text-navy-950">{item.value}</span>
                      <span className="rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold text-ink-500">{item.mentions}×</span>
                    </p>
                    <p className="mt-1 truncate text-[10px] text-ink-400">{item.from.slice(0, 3).join(", ")}{item.from.length > 3 ? ` +${item.from.length - 3} more` : ""}</p>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-ink-400">Descriptive only — these are mentions, not legal conclusions.</p>
    </Panel>
  );
}

function SmartTasksView({ reasoning }: { reasoning: CaseReasoning }) {
  if (reasoning.smartTasks.length === 0) return null;
  return (
    <Panel eyebrow="Suggested actions" title="Tasks from court directions" description="Ready-to-action suggestions generated from the pending directions in the court record. Each traces to its source order — verify before acting.">
      <ul className="space-y-2">
        {reasoning.smartTasks.map((task) => (
          <li key={task.id} className="flex items-start gap-3 rounded-lg border border-ink-100 p-3">
            <span className="mt-0.5 rounded bg-navy-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy-700">{task.kind}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-navy-950">{task.title}</p>
              {task.dueDate ? <p className="mt-0.5 text-xs text-ink-500">Suggested due: {format(new Date(task.dueDate), "dd MMM yyyy")} (verify)</p> : null}
              <p className="mt-1 text-[11px] italic text-ink-400">{task.provenance}</p>
              <SourceRefs sources={[task.source]} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-ink-400">Generated deterministically from court directions — suggestions, not instructions.</p>
    </Panel>
  );
}

/* ------------------------------ post-hearing ---------------------------- */

function PostHearingView({ reasoning }: { reasoning: CaseReasoning }) {
  if (!reasoning.postHearing.hasChanges) return null;
  return (
    <Panel eyebrow="Post-hearing update" title="Update matter?" description="Changes detected from the court record. Review before applying — nothing is overwritten silently.">
      <ul className="space-y-2">
        {reasoning.postHearing.changes.map((c) => (
          <li key={c.id} className="flex items-start justify-between gap-3 rounded-lg border border-ink-200 p-3">
            <div>
              <p className="text-sm font-semibold text-navy-950">{c.label}</p>
              <p className="mt-0.5 font-mono text-xs text-ink-500">{c.before ?? "—"} → {c.after ?? "—"}</p>
              <SourceRefs sources={[c.source]} />
            </div>
            {c.reviewRequired ? (
              <span className="shrink-0 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">Review</span>
            ) : null}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* ------------------------------- snapshot ------------------------------- */

function SnapshotView({ reasoning }: { reasoning: CaseReasoning }) {
  const s = reasoning.snapshot;
  return (
    <Panel eyebrow="Matter snapshot" title="At a glance" description="A concise, exportable one-page view of this matter.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SnapshotField label="Current stage" value={s.currentStage ?? "—"} />
        <SnapshotField label="Next hearing" value={s.nextHearing ?? "Not scheduled"} />
        <SnapshotField label="Key issues" value={s.keyIssues.length ? `${s.keyIssues.length} identified` : "None recorded"} />
        <SnapshotField label="Next actions" value={s.nextActions.length ? `${s.nextActions.length} warranted` : "None"} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">Important evidence</p>
          <ul className="mt-2 space-y-1 text-sm text-ink-700">
            {s.importantEvidence.length ? s.importantEvidence.map((e, i) => <li key={i}>✓ {e}</li>) : <li className="text-ink-500">None recorded</li>}
          </ul>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">Missing evidence</p>
          <ul className="mt-2 space-y-1 text-sm text-critical-600">
            {s.missingEvidence.length ? s.missingEvidence.slice(0, 8).map((e, i) => <li key={i}>○ {e}</li>) : <li className="text-ink-500">None flagged</li>}
          </ul>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">Pending directions</p>
          <ul className="mt-2 space-y-1 text-sm text-ink-700">
            {s.pendingDirections.length ? s.pendingDirections.slice(0, 6).map((d, i) => <li key={i}>{d}</li>) : <li className="text-ink-500">None pending</li>}
          </ul>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">Risks / uncertainties</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-700">
            {s.risks.length ? s.risks.slice(0, 6).map((r, i) => <li key={i}>· {r}</li>) : <li className="text-ink-500">None flagged</li>}
          </ul>
        </div>
      </div>
      {s.disputedFacts.length ? (
        <div className="mt-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">Disputed facts</p>
          <ul className="mt-2 space-y-1 text-sm text-critical-600">
            {s.disputedFacts.map((f, i) => (
              <li key={i}>⚠ {f.label}{f.value ? ` — ${f.value}` : ""}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="mt-4 border-t border-ink-100 pt-3 text-[11px] text-ink-400">
        Generated {format(new Date(s.generatedAt), "d MMM yyyy, HH:mm")}. Snapshot describes recorded data — not a prediction of outcome.
      </p>
    </Panel>
  );
}

function SnapshotField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-ink-50/50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-navy-950">{value}</p>
    </div>
  );
}
