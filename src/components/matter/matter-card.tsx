import Link from "next/link";
import { ArrowUpRight, Circle, Landmark, MapPin } from "lucide-react";

export interface MatterCardData { id: string; title: string; matterType: string; status: string; nextAction: string | null; readinessScore: number | null; court: string | null; cnr: string | null; }

export function MatterCard({ matter }: { matter: MatterCardData }) {
  return <Link href={`/app/matters/${matter.id}/overview`} className="group relative grid min-h-48 grid-rows-[auto_1fr_auto] overflow-hidden border border-ink-200 bg-white p-5 transition-colors hover:border-navy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-700">
    <div className="flex items-center justify-between gap-3"><span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-500">{matter.matterType}</span><span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-verified-700"><Circle className="h-1.5 w-1.5 fill-current" />{matter.status}</span></div>
    <div className="py-5"><h3 className="font-serif-display text-xl leading-7 text-navy-950 group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">{matter.title}</h3><p className="mt-3 flex items-center gap-1.5 text-xs text-ink-500">{matter.court ? <><Landmark className="h-3.5 w-3.5" />{matter.court}</> : <><MapPin className="h-3.5 w-3.5" />{matter.cnr ?? "Court not linked"}</>}</p></div>
    <div className="flex items-end justify-between gap-4 border-t border-ink-200 pt-4"><div className="min-w-0"><p className="eyebrow">Next action</p><p className="mt-1 truncate text-xs text-ink-700">{matter.nextAction ?? "Continue the matter record"}</p></div><ArrowUpRight className="h-4 w-4 shrink-0 text-ink-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-navy-800" /></div>
  </Link>;
}
