import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMatterDetail } from "@/lib/matters/service";
import { ReadinessBar } from "@/components/matter/readiness-bar";
import { VerificationBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

export default async function MatterOverviewPage({
  params,
}: PageProps<"/app/matters/[id]/overview">) {
  const user = await getCurrentUser();
  if (!user) return notFound();
  const { id } = await params;
  const matter = await getMatterDetail(user.id, id, { includeSteps: true });
  if (!matter) return notFound();

  const upcomingTasks = matter.tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"))
    .slice(0, 5);
  const recentEvents = matter.events.slice(0, 5);

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Situation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {matter.description ? (
              <p className="text-sm leading-relaxed text-ink-700">
                {matter.description}
              </p>
            ) : (
              <p className="text-sm text-ink-400">
                No description saved yet.
              </p>
            )}
            {matter.facts.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">
                  Key facts
                </p>
                <ul className="space-y-1.5">
                  {matter.facts.slice(0, 8).map((f) => (
                    <li key={f.id} className="flex items-start gap-2 text-sm text-ink-700">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-navy-700" />
                      {f.fact}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {recentEvents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentEvents.map((e) => (
                <div key={e.id} className="flex items-start gap-3">
                  <div className="mt-0.5 min-w-20 text-xs font-medium text-ink-500">
                    {e.eventDate ? format(new Date(e.eventDate), "d MMM yyyy") : "—"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink-900">{e.title}</p>
                    {e.description && (
                      <p className="text-sm text-ink-500">{e.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Readiness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ReadinessBar score={matter.readinessScore ?? 0} />
            {matter.nextAction && (
              <div className="rounded-md border border-navy-100 bg-navy-100/40 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-navy-800">
                  Next action
                </p>
                <p className="mt-1 text-sm text-navy-950">{matter.nextAction}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {matter.parties.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Parties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {matter.parties.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-ink-700">{p.name}</span>
                  <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] capitalize text-ink-600">
                    {p.role}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {upcomingTasks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>To-dos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingTasks.map((t) => (
                <div key={t.id} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  <div>
                    <p className="text-ink-900">{t.title}</p>
                    {t.dueDate && (
                      <p className="text-xs text-ink-400">due {t.dueDate}</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {matter.sources.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Key sources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {matter.sources.slice(0, 4).map((s) => (
                <div key={s.id} className="space-y-1">
                  <p className="text-sm font-medium text-ink-900">{s.title}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink-500">{s.citation ?? s.type}</span>
                    <VerificationBadge status={s.status} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
