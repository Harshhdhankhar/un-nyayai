import type { MatterStatus, StatusSection } from "@/lib/intelligence/matter-status";
import { CheckCircle2, Clock3, FileQuestion, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const style: Record<MatterStatus, { dot: string; icon: React.ReactNode; badge: string }> = {
  good: { dot: "bg-verified-500", icon: <CheckCircle2 className="h-4 w-4 text-verified-600" />, badge: "text-verified-700" },
  attention: { dot: "bg-amber-500", icon: <TriangleAlert className="h-4 w-4 text-amber-600" />, badge: "text-amber-700" },
  missing: { dot: "bg-ink-400", icon: <FileQuestion className="h-4 w-4 text-ink-500" />, badge: "text-ink-600" },
  needs_refresh: { dot: "bg-sky-500", icon: <Clock3 className="h-4 w-4 text-sky-600" />, badge: "text-sky-700" },
};

const label: Record<MatterStatus, string> = {
  good: "In good shape",
  attention: "Needs attention",
  missing: "Missing",
  needs_refresh: "Needs refresh",
};

export function MatterStatusPanel({ sections }: { sections: StatusSection[] }) {
  const needsWork = sections.filter((s) => s.status !== "good").length;

  return (
    <section className="border border-ink-200 bg-white p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="eyebrow text-navy-700">Matter status</h2>
        {needsWork === 0 ? (
          <span className="rounded-full bg-verified-100 px-2 py-0.5 text-[10px] font-semibold text-verified-700">All in good shape</span>
        ) : (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            {needsWork} {needsWork === 1 ? "area" : "areas"} to review
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-ink-500">A breakdown of this matter&apos;s information — not a judgement on the case itself.</p>
      <ul className="mt-4 space-y-3">
        {sections.map((s) => (
          <li key={s.key} className="flex items-start gap-3">
            <span className="mt-0.5">{style[s.status].icon}</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <p className="text-sm font-semibold text-navy-950">{s.label}</p>
                <span className={cn("text-[10px] font-bold uppercase tracking-wide", style[s.status].badge)}>{label[s.status]}</span>
              </div>
              <p className="mt-0.5 text-xs leading-5 text-ink-500">{s.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
