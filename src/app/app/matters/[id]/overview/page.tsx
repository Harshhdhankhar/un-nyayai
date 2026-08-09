import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, CheckCircle2, CircleAlert, FileText, MapPin } from "lucide-react";
import { format } from "date-fns";
import { getCurrentUser } from "@/lib/auth";
import { getMatterDetail } from "@/lib/matters/service";
import { buildEvidenceChecklist } from "@/lib/matters/evidence";
import { getMatterRouteWithSteps } from "@/lib/legal/routes";
import { VerificationBadge } from "@/components/ui/badge";

export default async function MatterOverviewPage({ params }: PageProps<"/app/matters/[id]/overview">) {
  const user = await getCurrentUser(); if (!user) return notFound(); const { id } = await params;
  const matter = await getMatterDetail(user.id, id, { includeSteps: true }); if (!matter) return notFound();
  const [evidence, routeRows] = await Promise.all([buildEvidenceChecklist(id), getMatterRouteWithSteps(id)]);
  const stepStates = matter.routeSteps.map((row) => row.state).filter(Boolean);
  const explicitCurrent = stepStates.find((state) => state?.status === "IN_PROGRESS" || state?.status === "NEEDS_INFORMATION" || state?.status === "BLOCKED");
  const currentStep = explicitCurrent ? routeRows.find((row) => row.step.order === explicitCurrent.stepOrder)?.step : routeRows.find((row) => !stepStates.some((state) => state?.stepOrder === row.step.order && state.status === "COMPLETED"))?.step;
  const recentEvents = [...matter.events].sort((a, b) => (b.eventDate ?? "").localeCompare(a.eventDate ?? "")).slice(0, 4);
  const pendingTasks = matter.tasks.filter((task) => task.status !== "done").sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  const nextAction = matter.nextAction ?? pendingTasks[0]?.title ?? currentStep?.title;

  return <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_21rem]">
    <div className="min-w-0 space-y-9">
      <section className="document-surface border-t-2 border-t-navy-950 p-5 sm:p-8"><p className="eyebrow">Matter understanding</p>{matter.description ? <p className="mt-4 max-w-3xl font-serif-display text-xl leading-8 text-navy-950 sm:text-2xl sm:leading-9">{matter.description}</p> : <p className="mt-4 text-sm text-ink-400">No situation description has been recorded.</p>}{matter.facts.length ? <div className="mt-7 border-t border-ink-200 pt-5"><p className="eyebrow">Recorded facts</p><ul className="mt-3 grid gap-3 sm:grid-cols-2">{matter.facts.slice(0, 8).map((fact) => <li key={fact.id} className="flex items-start gap-2.5 text-sm leading-6 text-ink-700"><span className="mt-2 h-1.5 w-1.5 shrink-0 bg-navy-700" />{fact.fact}</li>)}</ul></div> : null}</section>

      <section><div className="mb-4 flex items-end justify-between"><div><p className="eyebrow">Current position</p><h2 className="mt-2 font-serif-display text-2xl text-navy-950">Where this Matter stands</h2></div><Link href={`/app/matters/${id}/nyaypath`} className="inline-flex items-center gap-1 text-xs font-semibold text-navy-800">Open NyayPath <ArrowRight className="h-3.5 w-3.5" /></Link></div><div className="grid gap-px bg-ink-200 sm:grid-cols-2"><div className="bg-white p-5"><MapPin className="h-5 w-5 text-navy-800" /><p className="eyebrow mt-5">Current stage</p><p className="mt-2 font-serif-display text-xl text-navy-950">{currentStep?.title ?? "Route not yet established"}</p>{currentStep?.whyItMatters ? <p className="mt-2 text-sm leading-6 text-ink-500">{currentStep.whyItMatters}</p> : null}</div><div className="bg-navy-950 p-5 text-white"><ArrowRight className="h-5 w-5 text-white/70" /><p className="mt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">Next action</p><p className="mt-2 font-serif-display text-xl">{nextAction ?? "Add more facts to identify the next action"}</p></div></div></section>

      <section><div className="mb-4 flex items-end justify-between"><div><p className="eyebrow">Activity</p><h2 className="mt-2 font-serif-display text-2xl text-navy-950">What happened recently</h2></div><Link href={`/app/matters/${id}/timeline`} className="text-xs font-semibold text-navy-800">Full timeline</Link></div>{recentEvents.length ? <div className="border-t border-ink-300">{recentEvents.map((event) => <div key={event.id} className="grid gap-2 border-b border-ink-200 py-4 sm:grid-cols-[7.5rem_1fr_auto]"><time className="text-xs font-semibold text-ink-500">{event.eventDate ? format(new Date(event.eventDate), "d MMM yyyy") : "Date not set"}</time><div><p className="text-sm font-semibold text-navy-950">{event.title}</p>{event.description ? <p className="mt-1 text-sm text-ink-500">{event.description}</p> : null}</div><span className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-400">{event.source}</span></div>)}</div> : <EmptyLine text="No activity has been recorded yet." />}</section>
    </div>

    <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
      {matter.cnr ? <ContextCard icon={<CalendarDays />} title="Court case"><p className="font-mono text-xs text-ink-700">{matter.cnr}</p><Link href={`/app/matters/${id}/case`} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-navy-800">View official record <ArrowRight className="h-3 w-3" /></Link></ContextCard> : null}
      <ContextCard icon={<CircleAlert />} title="Missing or useful next">{evidence.missing.length || pendingTasks.length ? <ul className="space-y-2">{pendingTasks.slice(0, 2).map((task) => <li key={task.id} className="text-sm leading-5 text-ink-700">{task.title}</li>)}{evidence.missing.slice(0, 3).map((item) => <li key={item.title} className="flex items-start gap-2 text-sm leading-5 text-ink-700"><FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" />{item.title}</li>)}</ul> : <p className="inline-flex items-center gap-2 text-sm text-verified-700"><CheckCircle2 className="h-4 w-4" /> Nothing currently flagged.</p>}</ContextCard>
      {matter.sources.length ? <ContextCard title="Sources"><div className="space-y-4">{matter.sources.slice(0, 4).map((source) => <div key={source.id}><p className="text-sm font-semibold text-navy-950">{source.title}</p><div className="mt-1 flex items-center justify-between gap-2"><span className="truncate text-xs text-ink-500">{source.citation ?? source.authority ?? source.type}</span><VerificationBadge status={source.status} /></div></div>)}</div><Link href={`/app/matters/${id}/research`} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-navy-800">Open sources <ArrowRight className="h-3 w-3" /></Link></ContextCard> : null}
    </aside>
  </div>;
}
function ContextCard({ icon, title, children }: { icon?: React.ReactNode; title: string; children: React.ReactNode }) { return <section className="border border-ink-200 bg-white p-5">{icon ? <div className="mb-4 text-navy-800 [&_svg]:h-5 [&_svg]:w-5">{icon}</div> : null}<h2 className="eyebrow text-navy-700">{title}</h2><div className="mt-3">{children}</div></section>; }
function EmptyLine({ text }: { text: string }) { return <div className="border border-dashed border-ink-300 p-8 text-center text-sm text-ink-500">{text}</div>; }
