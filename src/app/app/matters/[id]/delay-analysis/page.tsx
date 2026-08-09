import { notFound } from "next/navigation";
import { AlertTriangle, Clock3 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMatterDetail } from "@/lib/matters/service";
import { lookupCaseByCnr } from "@/lib/providers/ecourts";
import { analyzeHearings } from "@/lib/legal/delay-analysis";

export default async function DelayAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return notFound();
  const { id } = await params;
  const matter = await getMatterDetail(user.id, id);
  if (!matter) return notFound();
  if (!matter.cnr) return <EmptyState text="Link a CNR to this Matter before analysing court delays." />;

  const { caseData, mode } = await lookupCaseByCnr(matter.cnr);
  const analysis = analyzeHearings(caseData.history);
  if (!analysis.total) return <EmptyState text="eCourts did not return hearing history for this case, so no delay analysis can be made." />;

  return (
    <div className="space-y-9">
      <header className="max-w-3xl"><div className="flex items-center gap-3"><p className="eyebrow text-navy-700">Case delay summary</p><span className={`text-[10px] font-bold uppercase tracking-[0.12em] ${mode === "live" ? "text-verified-700" : "text-amber-700"}`}>{mode === "live" ? "Verified eCourts record" : "Demo data — not official"}</span></div><h2 className="mt-3 font-serif-display text-3xl text-navy-950">What the hearing record shows</h2><p className="mt-2 text-sm leading-6 text-ink-600">This classification uses only the purpose and result recorded for each hearing. It does not assign blame where the record is unclear.</p></header>
      <section className="grid border-y border-ink-300 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Hearings" value={analysis.total} />
        <Metric label="Postponed / adjourned" value={analysis.postponed} />
        <Metric label="Substantive" value={analysis.substantive} />
        <Metric label="Average gap" value={analysis.averageGap === null ? "—" : `${analysis.averageGap} days`} />
        <Metric label="Longest gap" value={analysis.longestGap === null ? "—" : `${analysis.longestGap} days`} />
      </section>
      <section><p className="eyebrow">Chronological delay map</p><div className="mt-4 overflow-x-auto pb-3"><ol className="flex min-w-max items-start gap-0">{analysis.hearings.map((hearing, index) => <li key={`${hearing.hearingDate}-${index}`} className="relative w-44 pr-4 before:absolute before:left-3 before:right-0 before:top-3 before:h-px before:bg-ink-300 last:before:hidden"><span className={`relative z-10 block h-6 w-6 rounded-full border-4 border-paper ${hearing.reason === "substantive hearing" ? "bg-verified-600" : hearing.reason === "reason unclear" ? "bg-ink-400" : "bg-amber-600"}`} /><time className="mt-3 block text-xs font-semibold text-navy-950">{hearing.hearingDate || "Date unavailable"}</time><span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-ink-500">{hearing.reason}</span>{hearing.gapDays !== null && index > 0 ? <span className="mt-2 inline-flex items-center gap-1 text-[10px] text-ink-400"><Clock3 className="h-3 w-3" /> {hearing.gapDays} day gap</span> : null}</li>)}</ol></div></section>
      <section className="grid gap-7 lg:grid-cols-[1fr_20rem]"><div><p className="eyebrow">Source evidence</p><div className="mt-3 divide-y divide-ink-200 border-y border-ink-200">{analysis.hearings.map((hearing, index) => <div key={`${hearing.hearingDate}-source-${index}`} className="grid gap-2 py-4 sm:grid-cols-[7rem_10rem_1fr]"><time className="text-xs font-semibold text-ink-500">{hearing.hearingDate || "—"}</time><span className="text-xs capitalize text-amber-700">{hearing.reason}</span><div><p className="text-sm font-medium text-navy-950">{hearing.purpose || "Hearing"}</p><p className="mt-1 text-xs leading-5 text-ink-500">{hearing.result || "No result text returned."}</p></div></div>)}</div></div><aside className="border border-ink-200 bg-white p-5 self-start"><AlertTriangle className="h-5 w-5 text-amber-700" /><h3 className="mt-3 font-serif-display text-xl text-navy-950">Delay brief</h3><p className="mt-2 text-sm leading-6 text-ink-600">{analysis.unclear ? `${analysis.unclear} hearing${analysis.unclear === 1 ? " has" : "s have"} no clear recorded reason. ` : ""}{analysis.postponed ? `${analysis.postponed} hearing${analysis.postponed === 1 ? " appears" : "s appear"} postponed or adjourned from the available text.` : "No postponement was identified from the available text."}</p><p className="mt-4 border-t border-ink-200 pt-4 text-xs leading-5 text-ink-500">Generated classification — review the original orders before relying on it or preparing an objection.</p></aside></section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div className="border-b border-ink-200 py-5 sm:border-b-0 sm:border-r sm:px-5 first:pl-0 last:border-r-0"><p className="font-serif-display text-2xl text-navy-950">{value}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-500">{label}</p></div>; }
function EmptyState({ text }: { text: string }) { return <div className="mx-auto max-w-xl border border-dashed border-ink-300 px-6 py-14 text-center"><Clock3 className="mx-auto h-6 w-6 text-ink-400" /><h2 className="mt-4 font-serif-display text-2xl text-navy-950">Delay analysis unavailable</h2><p className="mt-2 text-sm leading-6 text-ink-500">{text}</p></div>; }
