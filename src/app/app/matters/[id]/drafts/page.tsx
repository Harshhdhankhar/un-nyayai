import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMatterDetail } from "@/lib/matters/service";
import { listDrafts } from "@/lib/drafting/service";
import { GenerateDraft } from "@/components/drafting/generate-draft";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default async function MatterDraftsPage({
  params,
}: PageProps<"/app/matters/[id]/drafts">) {
  const user = await getCurrentUser();
  if (!user) return notFound();
  const { id } = await params;
  const matter = await getMatterDetail(user.id, id);
  if (!matter) return notFound();

  const drafts = await listDrafts(user.id, id);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">
          Generated from case facts — review before use.
        </p>
        <GenerateDraft
          matterId={id}
          initialFacts={matter.facts}
          initialParties={matter.parties}
        />
      </div>

      {drafts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ink-200 bg-white py-16 text-center">
          <p className="text-sm text-ink-500">No drafts yet.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {drafts.map((d) => (
            <Link
              key={d.id}
              href={`/app/matters/${id}/drafts/${d.id}`}
              className="rounded-md border border-ink-200 bg-white p-4 transition-colors hover:border-navy-700"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-ink-900">{d.title}</p>
                <Badge tone={d.status === "final" ? "green" : d.status === "review" ? "amber" : "slate"}>
                  {d.status}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-ink-400">
                {d.kind} · updated {format(new Date(d.updatedAt), "d MMM yyyy")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
