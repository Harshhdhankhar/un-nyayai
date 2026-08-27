import { notFound } from "next/navigation";
import Link from "next/link";
import { format, isBefore } from "date-fns";
import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, FileText } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMatterDetail } from "@/lib/matters/service";
import { calculateDeadlineForEvent } from "@/lib/legal/deadlines";
import { buildHearingPrep } from "@/lib/intelligence/hearing";
import { buildCaseJourney } from "@/lib/intelligence/hearing-story";
import { getLatestPair } from "@/lib/intelligence/case-store";
import { PrintBriefButton } from "@/components/matter/print-brief";
import { CaseRefresh } from "@/components/case-status/case-refresh";
import { PostHearingCapture } from "@/components/case-status/post-hearing-capture";

const readinessTone: Record<string, string> = {
  READY: "text-verified-700",
  NEEDS_ATTENTION: "text-amber-700",
  MISSING: "text-critical-600",
};

export default async function HearingPrepPage({ params }: PageProps<"/app/matters/[id]/hearings">) {
  const user = await getCurrentUser();
  if (!user) return notFound();
  const { id } = await params;
  const matter = await getMatterDetail(user.id, id);
  if (!matter) return notFound();
  const prep = await buildHearingPrep(user.id, id);
  const { current: snapshot } = await getLatestPair(id);
  const journey = buildCaseJourney(snapshot, matter as never);

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
  const hearingNotes = matter.events
    .filter((e) => e.source === "user" && /hearing note/i.test(e.title))
    .sort((a, b) => (b.eventDate ?? "").localeCompare(a.eventDate ?? ""));

  return (
    <div className="hearing-brief">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-navy-950 pb-5">
        <div>
          <p className="eyebrow text-navy-700">Professional brief</p>
          <h2 className="mt-2 font-serif-display text-3xl text-navy-950">Hearing preparation</h2>
          <p className="mt-2 text-sm text-ink-500">Prepared from the facts, records and court file currently stored in this Matter.</p>
        </div>
        <PrintBriefButton />
      </header>

      <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-7">
          <BriefSection number="01" title="Pre-hearing readiness">
            {prep && prep.readiness.items.length ? (
              <ul className="space-y-2">
                {prep.readiness.items.map((item) => (
                  <li key={item.id} className="flex items-start gap-2.5">
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-current ${readinessTone[item.status] ?? "bg-ink-400"}`} />
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${readinessTone[item.status] ?? "text-ink-700"}`}>{item.check}</p>
                      <p className="text-xs leading-5 text-ink-500">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No readiness assessment is available yet.</p>
            )}
            {prep?.readiness.overall ? (
              <p className="mt-3 text-[11px] text-ink-400">
                Overall: <span className="font-semibold">{prep.readiness.overall.toLowerCase().replaceAll("_", " ")}</span> (worst item) — an honest checklist, not a score.
              </p>
            ) : null}
          </BriefSection>

          <BriefSection number="02" title="Where the matter stands">
            <p>{matter.description ?? "No Matter description is recorded."}</p>
            {matter.nextAction ? <p className="mt-3 border-l-2 border-navy-800 pl-3 font-semibold text-navy-950">Next: {matter.nextAction}</p> : null}
          </BriefSection>

          <BriefSection number="03" title="What happened last">
            {latestEvent ? <div><p className="font-semibold text-navy-950">{latestEvent.title}</p><p className="mt-1 text-xs text-ink-500">{latestEvent.eventDate ? format(new Date(latestEvent.eventDate), "d MMM yyyy") : "Date not recorded"} · {latestEvent.source}</p>{latestEvent.description ? <p className="mt-2">{latestEvent.description}</p> : null}</div> : <p>No event has been recorded.</p>}
          </BriefSection>

          <BriefSection number="04" title="Case journey">
            {journey.statements.length ? (
              <div>
                <ol className="space-y-2.5">
                  {journey.statements.map((statement, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-sm leading-6 text-ink-700">
                      <span className="mt-1 text-xs font-semibold text-navy-700">{index + 1}.</span>
                      <span>{statement.text}</span>
                    </li>
                  ))}
                </ol>
                {journey.hearings.length ? (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-xs font-semibold text-navy-800">View full hearing record ({journey.hearings.length})</summary>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead><tr className="border-b border-ink-300 text-ink-400"><th className="py-1.5 pr-3">Date</th><th className="py-1.5 pr-3">Purpose</th><th className="py-1.5">Result</th></tr></thead>
                        <tbody>
                          {journey.hearings.map((h, index) => (
                            <tr key={index} className="border-b border-ink-200">
                              <td className="py-1.5 pr-3 text-ink-600">{h.hearingDate || "—"}</td>
                              <td className="py-1.5 pr-3 text-ink-700">{h.purpose || "—"}</td>
                              <td className="py-1.5 text-ink-500">{h.result || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                ) : null}
                <p className="mt-3 text-[11px] leading-5 text-ink-400">Every statement above is traceable to the court record or a recorded Matter event.</p>
              </div>
            ) : (
              <p>No case history is available yet. Connect a CNR to load the official record.</p>
            )}
          </BriefSection>

          {hearingNotes.length ? (
            <BriefSection number="10" title="Your hearing notes (user-provided)">
              <ul className="space-y-3">
                {hearingNotes.map((note) => (
                  <li key={note.id} className="rounded-md border border-dashed border-ink-300 p-3">
                    <p className="text-sm font-semibold text-navy-950">{note.title.replace(/^USER-PROVIDED HEARING NOTE — /, "")}</p>
                    {note.eventDate ? <p className="mt-0.5 text-xs text-ink-500">{format(new Date(note.eventDate), "d MMM yyyy")}</p> : null}
                    {note.description ? <p className="mt-1.5 text-sm leading-6 text-ink-700 whitespace-pre-line">{note.description}</p> : null}
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-amber-700">User-provided · not yet verified against the court record</p>
                  </li>
                ))}
              </ul>
            </BriefSection>
          ) : null}
          {prep && prep.pendingDirections.length ? (
            <BriefSection number="05" title="Pending court directions">
              <ul className="space-y-3">
                {prep.pendingDirections.map((d) => (
                  <li key={d.id} className="border-l-2 border-amber-400 pl-3">
                    <p className="text-sm font-medium text-navy-950">{d.text}</p>
                    {d.addressee ? <p className="mt-0.5 text-xs text-ink-500">Addressed to: {d.addressee}</p> : null}
                    {d.deadline?.dueDate ? <p className="mt-0.5 text-xs text-ink-500">Due {d.deadline.dueDate}</p> : null}
                  </li>
                ))}
              </ul>
            </BriefSection>
          ) : null}

          <BriefSection number="06" title="Pending tasks">
            <Checklist items={pendingTasks.map((task) => `${task.title}${task.dueDate ? ` — due ${task.dueDate}` : ""}`)} empty="No pending tasks." />
          </BriefSection>

          <BriefSection number="07" title="Documents to review or carry">
            {matter.documents.length ? <ul className="divide-y divide-ink-200 border-y border-ink-200">{matter.documents.map((document) => <li key={document.id} className="flex items-center gap-2 py-3"><FileText className="h-4 w-4 text-navy-700" /><Link href={`/app/matters/${id}/documents`} className="text-sm font-semibold text-navy-950 hover:underline">{document.name}</Link><span className="ml-auto text-[10px] uppercase tracking-[0.1em] text-ink-400">{document.status}</span></li>)}</ul> : <p>No documents have been added to this Matter. <Link href={`/app/matters/${id}/documents`} className="font-semibold text-navy-800 hover:underline">Add documents.</Link></p>}
          </BriefSection>

          <BriefSection number="08" title="Important facts"><Checklist items={matter.facts.map((fact) => fact.fact)} empty="No facts have been recorded." /></BriefSection>

          <BriefSection number="09" title="Relevant authorities">
            {matter.sources.length ? <div className="space-y-3">{matter.sources.map((source) => <div key={source.id} className="border-l-2 border-ink-300 pl-3"><p className="font-semibold text-navy-950">{source.title}</p><p className="mt-1 text-xs text-ink-500">{source.citation ?? source.authority ?? source.type} · {source.status.replaceAll("_", " ")}</p>{source.excerpt ? <p className="mt-2">{source.excerpt}</p> : null}</div>)}</div> : <p>No authorities attached. <Link href={`/app/matters/${id}/research`} className="font-semibold text-navy-800 hover:underline">Search case law.</Link></p>}
          </BriefSection>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <div className="bg-navy-950 p-5 text-white">
            <CalendarDays className="h-5 w-5 text-white/70" />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">Next hearing</p>
              {prep?.mode ? <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${prep.mode === "live" ? "bg-verified-700 text-white" : "bg-amber-600 text-white"}`}>{prep.mode === "live" ? "Verified" : "Demo data"}</span> : null}
            </div>
            <p className="mt-2 font-serif-display text-2xl">
              {prep?.nextHearingDate ? format(new Date(prep.nextHearingDate), "d MMM yyyy") : prep?.hasSnapshot ? "Not scheduled" : "No court record linked"}
            </p>
            {prep?.capturedAt ? <p className="mt-2 text-xs leading-5 text-white/60">Record captured {format(new Date(prep.capturedAt), "d MMM yyyy, HH:mm")}.</p> : <p className="mt-2 text-xs leading-5 text-white/60">{matter.cnr ? "Link and load the official record to see the current listing." : "Link a CNR to retrieve the official listing."}</p>}
            {matter.cnr ? <Link href={`/app/matters/${id}/case`} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white">View official record <ArrowRight className="h-3.5 w-3.5" /></Link> : <Link href={`/app/matters/${id}/case`} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white">Connect this matter to eCourts <ArrowRight className="h-3.5 w-3.5" /></Link>}
          </div>
          {prep && matter.cnr ? <div className="border border-ink-200 bg-white p-5"><CaseRefresh matterId={id} cnr={matter.cnr} capturedAt={prep.capturedAt ?? undefined} hasData={prep.hasSnapshot} /></div> : null}
          <PostHearingCapture matterId={id} />
          {nextDeadline ? <div className="border border-amber-300 bg-amber-100/40 p-5"><AlertTriangle className="h-5 w-5 text-amber-700" /><p className="eyebrow mt-4 text-amber-700">Verified deadline rule</p><p className="mt-2 text-sm font-semibold text-navy-950">{nextDeadline.rule.action}</p><p className="mt-1 text-xs text-ink-600">Due {format(new Date(nextDeadline.rule.dueDate), "d MMM yyyy")}</p><p className="mt-2 text-[11px] leading-5 text-ink-500">{nextDeadline.rule.statute}{nextDeadline.rule.section ? ` · s.${nextDeadline.rule.section}` : ""}</p></div> : null}
          <div className="border border-ink-200 bg-white p-5"><CheckCircle2 className="h-5 w-5 text-verified-700" /><p className="eyebrow mt-4">5-minute summary</p><p className="mt-2 text-sm leading-6 text-ink-700">Confirm the next hearing on the official record, address any pending directions, and review the key facts and documents before you go.</p></div>
          <p className="text-[11px] leading-5 text-ink-400">Preparation aid only. Confirm court dates independently and review extracted material before use in court.</p>
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
