import { notFound } from "next/navigation";
import { format, isBefore } from "date-fns";
import { AlertTriangle, CalendarDays, CheckCircle2, FileText } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMatterDetail } from "@/lib/matters/service";
import { calculateDeadlineForEvent } from "@/lib/legal/deadlines";
import { PrintBriefButton } from "@/components/matter/print-brief";

export default async function HearingPrepPage({ params }: PageProps<"/app/matters/[id]/hearings">) {
  const user = await getCurrentUser();
  if (!user) return notFound();
  const { id } = await params;
  const matter = await getMatterDetail(user.id, id);
  if (!matter) return notFound();

  const deadlines = [];
  for (const event of matter.events) {
    if (!event.eventDate) continue;
    const rule = await calculateDeadlineForEvent(event.title.toLowerCase(), new Date(event.eventDate));
    if (rule) deadlines.push({ event, rule });
  }
  deadlines.sort((a, b) => a.rule.dueDate.localeCompare(b.rule.dueDate));
  const nextDeadline = deadlines.find((item) => !isBefore(new Date(item.rule.dueDate), new Date()));
  const latestEvent = [...matter.events].sort((a, b) => (b.eventDate ?? "").localeCompare(a.eventDate ?? ""))[0];
  const pendingTasks = matter.tasks.filter((task) => task.status !== "done");

  return (
    <div className="hearing-brief">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-navy-950 pb-5">
        <div>
          <p className="eyebrow text-navy-700">Professional brief</p>
          <h2 className="mt-2 font-serif-display text-3xl text-navy-950">Hearing preparation</h2>
          <p className="mt-2 text-sm text-ink-500">Prepared from the facts and records currently stored in this Matter.</p>
        </div>
        <PrintBriefButton />
      </header>

      <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-7">
          <BriefSection number="01" title="Where the matter stands">
            <p>{matter.description ?? "No Matter description is recorded."}</p>
            {matter.nextAction ? <p className="mt-3 border-l-2 border-navy-800 pl-3 font-semibold text-navy-950">Next: {matter.nextAction}</p> : null}
          </BriefSection>
          <BriefSection number="02" title="What happened last">
            {latestEvent ? <div><p className="font-semibold text-navy-950">{latestEvent.title}</p><p className="mt-1 text-xs text-ink-500">{latestEvent.eventDate ? format(new Date(latestEvent.eventDate), "d MMM yyyy") : "Date not recorded"} · {latestEvent.source}</p>{latestEvent.description ? <p className="mt-2">{latestEvent.description}</p> : null}</div> : <p>No event has been recorded.</p>}
          </BriefSection>
          <BriefSection number="03" title="Pending tasks">
            <Checklist items={pendingTasks.map((task) => `${task.title}${task.dueDate ? ` — due ${task.dueDate}` : ""}`)} />
          </BriefSection>
          <BriefSection number="04" title="Documents to review or carry">
            {matter.documents.length ? <ul className="divide-y divide-ink-200 border-y border-ink-200">{matter.documents.map((document) => <li key={document.id} className="flex items-center gap-2 py-3"><FileText className="h-4 w-4 text-navy-700" /><span className="text-sm font-semibold text-navy-950">{document.name}</span><span className="ml-auto text-[10px] uppercase tracking-[0.1em] text-ink-400">{document.status}</span></li>)}</ul> : <p>No documents have been added to this Matter.</p>}
          </BriefSection>
          <BriefSection number="05" title="Important facts"><Checklist items={matter.facts.map((fact) => fact.fact)} empty="No facts have been recorded." /></BriefSection>
          <BriefSection number="06" title="Relevant authorities">
            {matter.sources.length ? <div className="space-y-3">{matter.sources.map((source) => <div key={source.id} className="border-l-2 border-ink-300 pl-3"><p className="font-semibold text-navy-950">{source.title}</p><p className="mt-1 text-xs text-ink-500">{source.citation ?? source.authority ?? source.type} · {source.status.replaceAll("_", " ")}</p>{source.excerpt ? <p className="mt-2">{source.excerpt}</p> : null}</div>)}</div> : <p>No authorities have been attached.</p>}
          </BriefSection>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <div className="bg-navy-950 p-5 text-white"><CalendarDays className="h-5 w-5 text-white/70" /><p className="mt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">Upcoming hearing</p><p className="mt-2 font-serif-display text-2xl">Open the Case tab</p><p className="mt-2 text-xs leading-5 text-white/60">{matter.cnr ? "Confirm the current eCourts listing before attending." : "Link a CNR to retrieve the official listing."}</p></div>
          {nextDeadline ? <div className="border border-amber-300 bg-amber-100/40 p-5"><AlertTriangle className="h-5 w-5 text-amber-700" /><p className="eyebrow mt-4 text-amber-700">Verified deadline rule</p><p className="mt-2 text-sm font-semibold text-navy-950">{nextDeadline.rule.action}</p><p className="mt-1 text-xs text-ink-600">Due {format(new Date(nextDeadline.rule.dueDate), "d MMM yyyy")}</p><p className="mt-2 text-[11px] leading-5 text-ink-500">{nextDeadline.rule.statute}{nextDeadline.rule.section ? ` · s.${nextDeadline.rule.section}` : ""}</p></div> : null}
          <div className="border border-ink-200 bg-white p-5"><CheckCircle2 className="h-5 w-5 text-verified-700" /><p className="eyebrow mt-4">5-minute summary</p><p className="mt-2 text-sm leading-6 text-ink-700">Review the latest event, pending tasks, key facts and every document marked for this Matter. Confirm any court date independently.</p></div>
          <p className="text-[11px] leading-5 text-ink-400">Preparation aid only. Generated and extracted material must be reviewed before use in court.</p>
        </aside>
      </div>
    </div>
  );
}

function BriefSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return <section className="grid gap-3 border-t border-ink-300 pt-5 sm:grid-cols-[3rem_1fr]"><span className="font-serif-display text-lg text-ink-300">{number}</span><div><h3 className="font-serif-display text-xl text-navy-950">{title}</h3><div className="mt-3 text-sm leading-6 text-ink-700">{children}</div></div></section>;
}

function Checklist({ items, empty = "Nothing recorded." }: { items: string[]; empty?: string }) {
  return items.length ? <ul className="space-y-2">{items.map((item, index) => <li key={`${item}-${index}`} className="flex items-start gap-2"><span className="mt-1.5 h-3 w-3 shrink-0 border border-ink-400" />{item}</li>)}</ul> : <p>{empty}</p>;
}
