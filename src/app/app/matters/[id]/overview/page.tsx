import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  FileText,
  MapPin,
  RefreshCw,
  Scale,
  ShieldAlert,
} from "lucide-react";
import { format } from "date-fns";
import { getCurrentUser } from "@/lib/auth";
import { getMatterDetail } from "@/lib/matters/service";
import { buildEvidenceChecklist } from "@/lib/matters/evidence";
import { getMatterRouteWithSteps } from "@/lib/legal/routes";
import { VerificationBadge } from "@/components/ui/badge";
import { computeReadiness } from "@/lib/legal/readiness";
import { ReadinessSummary } from "@/components/matter/readiness-summary";
import { buildOverviewIntelligence } from "@/lib/intelligence/overview";
import { ClientUpdateCard } from "@/components/matter/client-update-card";
import { getLatestDetail } from "@/lib/intelligence/case-store";
import { buildMatterStatus } from "@/lib/intelligence/matter-status";
import { countStaleSources, daysSince } from "@/lib/workbench/freshness";
import { MatterStatusPanel } from "@/components/matter/matter-status-panel";

export default async function MatterOverviewPage({ params }: PageProps<"/app/matters/[id]/overview">) {
  const user = await getCurrentUser(); if (!user) return notFound(); const { id } = await params;
  const matter = await getMatterDetail(user.id, id, { includeSteps: true }); if (!matter) return notFound();
  const [evidence, routeRows, intel] = await Promise.all([
    buildEvidenceChecklist(id),
    getMatterRouteWithSteps(id),
    buildOverviewIntelligence(user.id, id),
  ]);
  const cached = matter.cnr ? await getLatestDetail(id) : null;
  const snapshotAgeDays = cached ? daysSince(cached.capturedAt) : null;
  const matterStatus = buildMatterStatus({
    factCount: matter.facts.filter((fact) => fact.kind !== "missing").length,
    missingFactCount: matter.facts.filter((fact) => fact.kind === "missing").length,
    evidenceAvailable: evidence.available.length,
    evidenceMissing: evidence.missing.length,
    hasCnr: Boolean(matter.cnr),
    hasSnapshot: Boolean(cached),
    snapshotAgeDays,
    staleSnapshot: snapshotAgeDays !== null && snapshotAgeDays > 120,
    researchCount: matter.sources.length,
    staleSourceCount: countStaleSources(matter.sources),
    verifiedSourceCount: matter.sources.filter((s) => s.status === "verified").length,
    pendingDirectionCount: intel?.pendingDirectionCount ?? 0,
    contradictionCount: intel?.contradictions.length ?? 0,
    nextHearingDate: cached?.detail.record.nextHearingDate ?? null,
    hasDeadline: matter.tasks.some((task) => Boolean(task.dueDate)),
  });
  const stepStates = matter.routeSteps.map((row) => row.state).filter(Boolean);
  const explicitCurrent = stepStates.find((state) => state?.status === "IN_PROGRESS" || state?.status === "NEEDS_INFORMATION" || state?.status === "BLOCKED");
  const currentStep = explicitCurrent ? routeRows.find((row) => row.step.order === explicitCurrent.stepOrder)?.step : routeRows.find((row) => !stepStates.some((state) => state?.stepOrder === row.step.order && state.status === "COMPLETED"))?.step;
  const recentEvents = [...matter.events].sort((a, b) => (b.eventDate ?? "").localeCompare(a.eventDate ?? "")).slice(0, 4);
  const pendingTasks = matter.tasks.filter((task) => task.status !== "done").sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  const nextAction = matter.nextAction ?? pendingTasks[0]?.title ?? currentStep?.title;
  const readiness = computeReadiness({
    factCount: matter.facts.filter((fact) => fact.kind !== "missing").length,
    missingFactCount: matter.facts.filter((fact) => fact.kind === "missing").length,
    documentCount: matter.documents.length,
    eventCount: matter.events.length,
    sourceVerifiedCount: matter.sources.filter((source) => source.status === "verified").length,
    sourceCount: matter.sources.length,
    hasNextAction: Boolean(nextAction),
    missingEvidenceCount: evidence.missing.length,
    availableEvidenceCount: evidence.available.length,
    hasDeadlineInfo: matter.tasks.some((task) => Boolean(task.dueDate)),
  });

  const changes = intel?.changes ?? [];
  const needsAttention = intel && (intel.contradictions.length > 0 || intel.pendingDirectionCount > 0);

  return <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_21rem]">
    <div className="min-w-0 space-y-9">
      <section className="document-surface border-t-2 border-t-navy-950 p-5 sm:p-8"><p className="eyebrow">Matter understanding</p>{matter.description ? <p className="mt-4 max-w-3xl font-serif-display text-xl leading-8 text-navy-950 sm:text-2xl sm:leading-9">{matter.description}</p> : <p className="mt-4 text-sm text-ink-400">No situation description has been recorded.</p>}{matter.facts.length ? <div className="mt-7 border-t border-ink-200 pt-5"><p className="eyebrow">Recorded facts</p><ul className="mt-3 grid gap-3 sm:grid-cols-2">{matter.facts.slice(0, 8).map((fact) => <li key={fact.id} className="flex items-start gap-2.5 text-sm leading-6 text-ink-700"><span className="mt-2 h-1.5 w-1.5 shrink-0 bg-navy-700" />{fact.fact}</li>)}</ul></div> : null}</section>

      {changes.length ? (
        <section>
          <div className="mb-4"><p className="eyebrow">Since your last check</p><h2 className="mt-2 font-serif-display text-2xl text-navy-950">What changed on the court record</h2></div>
          <ul className="border-t border-ink-300">
            {changes.map((c) => (
              <li key={`${c.kind}-${c.label}-${c.after}`} className="grid items-center gap-2 border-b border-ink-200 py-3.5 sm:grid-cols-[auto_1fr]">
                <div className="flex items-center gap-2.5">
                  <RefreshCw className="h-4 w-4 shrink-0 text-navy-700" />
                  <p className="text-sm font-semibold text-navy-950">{c.label}</p>
                  {!c.before ? <span className="rounded bg-verified-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-verified-700">New</span> : null}
                </div>
                <p className="font-mono text-xs text-ink-500">
                  {c.before ?? "—"} <span className="text-ink-300">→</span> {c.after ?? "—"}
                  <span className="ml-2 font-sans text-[10px] uppercase tracking-wide text-ink-400">{c.source.label}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {needsAttention ? (
        <section>
          <div className="mb-4 flex items-end justify-between"><div><p className="eyebrow">Needs attention</p><h2 className="mt-2 font-serif-display text-2xl text-navy-950">Things to review</h2></div><Link href={`/app/matters/${id}/workbench`} className="inline-flex items-center gap-1 text-xs font-semibold text-navy-800">Open case reasoning <ArrowRight className="h-3.5 w-3.5" /></Link></div>
          <div className="space-y-3">
            {intel!.contradictions.slice(0, 3).map((c) => (
              <div key={c.id} className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-amber-900">Possible inconsistency — {c.label}</p>
                    <p className="mt-1 text-xs leading-5 text-amber-800">{c.note}</p>
                    <ul className="mt-2 space-y-1 text-xs text-ink-700">
                      {c.values.map((v, i) => <li key={i}>“{v.value}” — <span className="text-ink-400">{v.source.label}</span></li>)}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
            {intel!.pendingDirectionCount > 0 ? (
              <div className="flex items-center justify-between rounded-lg border border-ink-200 p-4">
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 shrink-0 text-navy-700" />
                  <div><p className="text-sm font-semibold text-navy-950">Pending court directions</p><p className="text-xs text-ink-500">{intel!.pendingDirectionCount} direction(s) marked pending in the record.</p></div>
                </div>
                <Link href={`/app/matters/${id}/workbench`} className="text-xs font-semibold text-navy-800 hover:underline">Review</Link>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section><div className="mb-4 flex items-end justify-between"><div><p className="eyebrow">Current position</p><h2 className="mt-2 font-serif-display text-2xl text-navy-950">Where this Matter stands</h2></div><Link href={`/app/matters/${id}/nyaypath`} className="inline-flex items-center gap-1 text-xs font-semibold text-navy-800">Open NyayPath <ArrowRight className="h-3.5 w-3.5" /></Link></div>{intel?.matterState ? <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-navy-200 bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-900" title={intel.matterState.reason}>{intel.matterState.label}</p> : null}<div className="grid gap-px bg-ink-200 sm:grid-cols-2"><div className="bg-white p-5"><MapPin className="h-5 w-5 text-navy-800" /><p className="eyebrow mt-5">Current stage</p><p className="mt-2 font-serif-display text-xl text-navy-950">{currentStep?.title ?? "Route not yet established"}</p>{currentStep?.whyItMatters ? <p className="mt-2 text-sm leading-6 text-ink-500">{currentStep.whyItMatters}</p> : null}</div><div className="bg-navy-950 p-5 text-white"><ArrowRight className="h-5 w-5 text-white/70" /><p className="mt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">Next action</p>{intel?.topAction ? (<div className="mt-2"><p className="font-serif-display text-xl">{intel.topAction.title}</p><p className="mt-2 text-xs leading-5 text-white/60">{intel.topAction.why}</p>{intel.topAction.href ? <Link href={intel.topAction.href} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white hover:underline">Go to it <ArrowRight className="h-3.5 w-3.5" /></Link> : null}</div>) : (<p className="mt-2 font-serif-display text-xl">{nextAction ?? "Add more facts to identify the next action"}</p>)}</div></div></section>

      <section><div className="mb-4 flex items-end justify-between"><div><p className="eyebrow">Activity</p><h2 className="mt-2 font-serif-display text-2xl text-navy-950">What happened recently</h2></div><Link href={`/app/matters/${id}/timeline`} className="text-xs font-semibold text-navy-800">Full timeline</Link></div>{recentEvents.length ? <div className="border-t border-ink-300">{recentEvents.map((event) => <div key={event.id} className="grid gap-2 border-b border-ink-200 py-4 sm:grid-cols-[7.5rem_1fr_auto]"><time className="text-xs font-semibold text-ink-500">{event.eventDate ? format(new Date(event.eventDate), "d MMM yyyy") : "Date not set"}</time><div><p className="text-sm font-semibold text-navy-950">{event.title}</p>{event.description ? <p className="mt-1 text-sm text-ink-500">{event.description}</p> : null}</div><span className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-400">{event.source}</span></div>)}</div> : <EmptyLine text="No activity has been recorded yet." />}</section>
    </div>

    <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
      <MatterStatusPanel sections={matterStatus} />
      <ReadinessSummary readiness={readiness} />
      {matter.cnr ? <ContextCard icon={<CalendarDays />} title="Court case"><p className="font-mono text-xs text-ink-700">{matter.cnr}</p><Link href={`/app/matters/${id}/case`} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-navy-800">View official record <ArrowRight className="h-3 w-3" /></Link></ContextCard> : null}
      <ContextCard icon={<CircleAlert />} title="Missing or useful next">{evidence.missing.length || pendingTasks.length ? <ul className="space-y-2">{pendingTasks.slice(0, 2).map((task) => <li key={task.id} className="text-sm leading-5 text-ink-700">{task.title}</li>)}{evidence.missing.slice(0, 3).map((item) => <li key={item.title} className="flex items-start gap-2 text-sm leading-5 text-ink-700"><FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" />{item.title}</li>)}</ul> : <p className="inline-flex items-center gap-2 text-sm text-verified-700"><CheckCircle2 className="h-4 w-4" /> Nothing currently flagged.</p>}</ContextCard>
      <ContextCard icon={<WorkbenchIcon />} title="Legal workbench"><p className="text-sm leading-6 text-ink-600">A source-backed case map: issues, claims, evidence, counterpositions and gaps — all grounded in this matter&apos;s records.</p><Link href={`/app/matters/${id}/workbench`} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-navy-800">Open case reasoning <ArrowRight className="h-3 w-3" /></Link></ContextCard>
      {intel?.clientUpdate ? <ClientUpdateCard plainText={intel.clientUpdate.plainText} /> : null}
      {matter.sources.length ? <ContextCard title="Sources"><div className="space-y-4">{matter.sources.slice(0, 4).map((source) => <div key={source.id}><p className="text-sm font-semibold text-navy-950">{source.title}</p><div className="mt-1 flex items-center justify-between gap-2"><span className="truncate text-xs text-ink-500">{source.citation ?? source.authority ?? source.type}</span><VerificationBadge status={source.status} /></div></div>)}</div><Link href={`/app/matters/${id}/research`} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-navy-800">Open sources <ArrowRight className="h-3 w-3" /></Link></ContextCard> : null}
    </aside>
  </div>;
}
function ContextCard({ icon, title, children }: { icon?: React.ReactNode; title: string; children: React.ReactNode }) { return <section className="border border-ink-200 bg-white p-5">{icon ? <div className="mb-4 text-navy-800 [&_svg]:h-5 [&_svg]:w-5">{icon}</div> : null}<h2 className="eyebrow text-navy-700">{title}</h2><div className="mt-3">{children}</div></section>; }
function EmptyLine({ text }: { text: string }) { return <div className="border border-dashed border-ink-300 p-8 text-center text-sm text-ink-500">{text}</div>; }
function WorkbenchIcon() { return <Scale className="h-5 w-5" />; }
