import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMatterDetail } from "@/lib/matters/service";
import { ResearchSearch } from "@/components/research/research-search";
import { VerificationBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sourceFreshness, countStaleSources } from "@/lib/workbench/freshness";

export default async function MatterResearchPage({
  params,
}: PageProps<"/app/matters/[id]/research">) {
  const user = await getCurrentUser();
  if (!user) return notFound();
  const { id } = await params;
  const matter = await getMatterDetail(user.id, id);
  if (!matter) return notFound();

  const staleCount = countStaleSources(matter.sources as Array<{ retrievedAt?: Date | string | null }>);

  return (
    <div className="space-y-5">
      <ResearchSearch matterId={id} />

      <Card>
        <CardHeader>
          <CardTitle>Saved sources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {matter.sources.length === 0 ? (
            <p className="text-sm text-ink-400">No sources saved yet.</p>
          ) : (
            matter.sources.map((s) => {
              const f = sourceFreshness(
                (s as { retrievedAt?: Date | string | null }).retrievedAt
              );
              return (
                <div key={s.id} className="rounded-md border border-ink-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-ink-900">{s.title}</p>
                    <VerificationBadge status={s.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {[s.type, s.authority, s.citation].filter(Boolean).join(" · ")}
                  </p>
                  {f.state === "stale" && (
                    <p className="mt-1 rounded-sm bg-amber-100 px-2 py-1 text-xs text-amber-800">
                      Retrieved {f.ageDays} days ago — re-check whether the law is
                      still current.
                    </p>
                  )}
                  {s.excerpt && (
                    <p className="mt-1 line-clamp-2 text-xs text-ink-500">{s.excerpt}</p>
                  )}
                  {s.url && (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs text-navy-700 underline"
                    >
                      View source
                    </a>
                  )}
                </div>
              );
            })
          )}
          {staleCount > 0 && (
            <p className="text-xs text-amber-800">
              {staleCount} saved {staleCount === 1 ? "source" : "sources"} {" "}
              {staleCount === 1 ? "was" : "were"} retrieved long ago and may need a
              re-check.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
