import { notFound } from "next/navigation";
import { format } from "date-fns";
import { FileText, Landmark, PenLine, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMatterDetail } from "@/lib/matters/service";
import { AddEventForm } from "@/components/matter/add-event-form";

const sourceMeta = {
  user: { label: "User fact", icon: PenLine, tone: "bg-navy-700" },
  document: { label: "Document", icon: FileText, tone: "bg-verified-600" },
  ecourts: { label: "eCourts", icon: Landmark, tone: "bg-amber-600" },
  ai: { label: "Generated", icon: Sparkles, tone: "bg-ink-500" },
} as const;

export default async function MatterTimelinePage({
  params,
}: PageProps<"/app/matters/[id]/timeline">) {
  const user = await getCurrentUser();
  if (!user) return notFound();
  const { id } = await params;
  const matter = await getMatterDetail(user.id, id);
  if (!matter) return notFound();
  const sorted = [...matter.events].sort((a, b) =>
    (a.eventDate ?? "").localeCompare(b.eventDate ?? ""),
  );
  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-navy-700">Unified chronology</p>
          <h2 className="mt-2 font-serif-display text-3xl text-navy-950">
            Matter timeline
          </h2>
          <p className="mt-2 text-sm text-ink-500">
            Facts, documents, court activity and generated actions in one
            record.
          </p>
        </div>
        <AddEventForm matterId={id} />
      </div>
      {sorted.length ? (
        <ol className="relative border-t border-ink-300">
          {sorted.map((event) => {
            const meta = sourceMeta[event.source];
            const Icon = meta.icon;
            return (
              <li
                key={event.id}
                className="group grid gap-3 border-b border-ink-200 py-5 sm:grid-cols-[7.5rem_2rem_1fr_7rem]"
              >
                <time className="text-xs font-semibold text-ink-500">
                  {event.eventDate
                    ? format(new Date(event.eventDate), "d MMM yyyy")
                    : "Date not set"}
                </time>
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full text-white ${meta.tone}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-navy-950">
                    {event.title}
                  </h3>
                  {event.description ? (
                    <p className="mt-1 text-sm leading-6 text-ink-600">
                      {event.description}
                    </p>
                  ) : null}
                </div>
                <div className="sm:text-right">
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-400">
                    {meta.label}
                  </span>
                  {!event.editable ? (
                    <span className="mt-1 block text-[10px] font-semibold text-verified-700">
                      Source locked
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="border border-dashed border-ink-300 py-16 text-center text-sm text-ink-500">
          No events recorded. Add the first fact or date to begin the
          chronology.
        </div>
      )}
    </div>
  );
}
