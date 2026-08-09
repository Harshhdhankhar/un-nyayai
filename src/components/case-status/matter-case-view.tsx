import { CalendarDays, ExternalLink, Landmark, Scale, Users } from "lucide-react";
import type { ECourtCaseDetail } from "@/lib/providers/ecourts/types";

export function MatterCaseView({ detail, mode }: { detail: ECourtCaseDetail; mode: "live" | "demo" }) {
  const { record } = detail;
  const latestHearing = detail.history.at(-1);
  const latestOrder = detail.orders.at(-1);
  return (
    <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-7">
        <section className="document-surface border-t-2 border-t-navy-950 p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 pb-5">
            <div>
              <p className="eyebrow">Official case record</p>
              <h2 className="mt-2 font-serif-display text-2xl text-navy-950">{record.petitioner || "Petitioner"} <span className="italic text-ink-400">v.</span> {record.respondent || "Respondent"}</h2>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-[0.14em] ${mode === "live" ? "text-verified-700" : "text-amber-700"}`}>{mode === "live" ? "Verified eCourts" : "Demo data — not official"}</span>
          </div>
          <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <RecordField label="CNR" value={record.cnr} mono />
            <RecordField label="Case number" value={record.caseNumber} />
            <RecordField label="Status" value={record.caseStatus} capitalize />
            <RecordField label="Court" value={record.courtName} />
            <RecordField label="Current stage" value={record.stage} />
            <RecordField label="Judge" value={record.judge} />
          </dl>
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between"><div><p className="eyebrow">Proceeding history</p><h2 className="mt-2 font-serif-display text-2xl text-navy-950">Hearings and orders</h2></div><span className="text-xs text-ink-500">{detail.history.length} recorded</span></div>
          {detail.history.length ? (
            <ol className="border-t border-ink-300">
              {[...detail.history].reverse().map((hearing, index) => (
                <li key={`${hearing.hearingDate}-${index}`} className="grid gap-2 border-b border-ink-200 py-5 sm:grid-cols-[8rem_1fr]">
                  <time className="text-xs font-semibold text-ink-500">{hearing.hearingDate || "Date unavailable"}</time>
                  <div><h3 className="text-sm font-semibold text-navy-950">{hearing.purpose || "Hearing"}</h3>{hearing.result ? <p className="mt-1 text-sm leading-6 text-ink-600">{hearing.result}</p> : <p className="mt-1 text-xs text-ink-400">No result recorded by the provider.</p>}</div>
                </li>
              ))}
            </ol>
          ) : <EmptyRecord text="No hearing history was returned by eCourts." />}
        </section>

        {detail.orders.length ? <section><p className="eyebrow">Orders</p><div className="mt-3 divide-y divide-ink-200 border-y border-ink-200">{[...detail.orders].reverse().map((order, index) => <div key={`${order.orderDate}-${index}`} className="flex items-start gap-4 py-4"><Scale className="mt-0.5 h-4 w-4 text-navy-700" /><div className="flex-1"><p className="text-sm font-semibold text-navy-950">{order.orderType}</p><p className="mt-1 text-xs text-ink-500">{order.orderDate}</p>{order.summary ? <p className="mt-2 text-sm text-ink-600">{order.summary}</p> : null}</div>{order.url ? <a href={order.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-navy-700">Official source <ExternalLink className="h-3 w-3" /></a> : null}</div>)}</div></section> : null}
      </div>

      <aside className="space-y-4 xl:sticky xl:top-8 xl:self-start">
        <div className="border-t-2 border-navy-950 bg-navy-950 p-5 text-white">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/60">Next listing</p>
          <p className="mt-4 font-serif-display text-2xl">{record.nextHearingDate ?? "Not scheduled"}</p>
          <p className="mt-2 text-xs leading-5 text-white/65">Confirm the date, bench and court through the official record or your advocate.</p>
        </div>
        <ContextItem icon={<Landmark />} label="Court" value={record.courtName || "Not recorded"} />
        <ContextItem icon={<CalendarDays />} label="Latest activity" value={latestOrder ? `${latestOrder.orderType} · ${latestOrder.orderDate}` : latestHearing ? `${latestHearing.purpose} · ${latestHearing.hearingDate}` : "No activity returned"} />
        <ContextItem icon={<Users />} label="Advocates" value={[...(detail.advocates?.petitioners ?? []), ...(detail.advocates?.respondents ?? [])].filter(Boolean).join(", ") || "Not returned"} />
      </aside>
    </div>
  );
}

function RecordField({ label, value, mono, capitalize }: { label: string; value: string | null; mono?: boolean; capitalize?: boolean }) { return <div><dt className="eyebrow">{label}</dt><dd className={`mt-1.5 text-sm text-ink-800 ${mono ? "font-mono text-xs" : ""} ${capitalize ? "capitalize" : ""}`}>{value || "Not recorded"}</dd></div>; }
function EmptyRecord({ text }: { text: string }) { return <div className="border border-dashed border-ink-300 px-5 py-10 text-center text-sm text-ink-500">{text}</div>; }
function ContextItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="border border-ink-200 bg-white p-4"><div className="flex items-center gap-2 text-navy-800 [&_svg]:h-4 [&_svg]:w-4">{icon}<span className="eyebrow">{label}</span></div><p className="mt-2 text-sm leading-5 text-ink-700">{value}</p></div>; }
