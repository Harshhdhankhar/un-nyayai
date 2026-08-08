import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMatterDetail } from "@/lib/matters/service";
import { AddEventForm } from "@/components/matter/add-event-form";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default async function MatterTimelinePage({
  params,
}: PageProps<"/app/matters/[id]/timeline">) {
  const user = await getCurrentUser();
  if (!user) return notFound();
  const { id } = await params;
  const matter = await getMatterDetail(user.id, id);
  if (!matter) return notFound();

  const sorted = [...matter.events].sort((a, b) =>
    (a.eventDate ?? "").localeCompare(b.eventDate ?? "")
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">
          Facts as you told them, merged with court data when available.
        </p>
        <AddEventForm matterId={id} />
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ink-200 bg-white py-16 text-center">
          <p className="text-sm text-ink-500">No events yet.</p>
        </div>
      ) : (
        <ol className="relative ml-3 space-y-6 border-l border-ink-200 pl-6">
          {sorted.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[1.7rem] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-navy-700" />
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-ink-900">{e.title}</p>
                {e.eventDate && (
                  <span className="text-xs text-ink-500">
                    {format(new Date(e.eventDate), "d MMM yyyy")}
                  </span>
                )}
                <Badge tone="slate">{e.source}</Badge>
                {!e.editable && <Badge tone="amber">from court record</Badge>}
              </div>
              {e.description && (
                <p className="mt-0.5 text-sm text-ink-600">{e.description}</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
