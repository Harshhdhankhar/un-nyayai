import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMatterDetail } from "@/lib/matters/service";
import { calculateDeadlineForEvent } from "@/lib/legal/deadlines";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isBefore } from "date-fns";

export default async function MatterHearingsPage({
  params,
}: PageProps<"/app/matters/[id]/hearings">) {
  const user = await getCurrentUser();
  if (!user) return notFound();
  const { id } = await params;
  const matter = await getMatterDetail(user.id, id);
  if (!matter) return notFound();

  const deadlines = [];
  for (const ev of matter.events) {
    if (!ev.eventDate) continue;
    const rule = await calculateDeadlineForEvent(
      ev.title.toLowerCase(),
      new Date(ev.eventDate)
    );
    if (rule) deadlines.push({ event: ev, rule });
  }
  deadlines.sort((a, b) => a.rule.dueDate.localeCompare(b.rule.dueDate));

  const now = new Date();
  const upcoming = deadlines.filter((d) => !isBefore(new Date(d.rule.dueDate), now));
  const passed = deadlines.filter((d) => isBefore(new Date(d.rule.dueDate), now));

  const docsPending = matter.documents.filter((d) => d.status !== "analyzed").length;
  const factsCount = matter.facts.length;
  const prepItems = [
    {
      label: "Key facts documented",
      done: factsCount >= 3,
      hint: `${factsCount} fact${factsCount === 1 ? "" : "s"} recorded`,
    },
    {
      label: "Documents uploaded & analyzed",
      done: docsPending === 0 && matter.documents.length > 0,
      hint:
        matter.documents.length === 0
          ? "none uploaded yet"
          : `${docsPending} pending analysis`,
    },
    {
      label: "Deadline / limitation checked",
      done: deadlines.length > 0,
      hint: deadlines.length > 0 ? "rules applied" : "no matching rule found",
    },
    {
      label: "Draft prepared",
      done: matter.drafts.length > 0,
      hint:
        matter.drafts.length === 0
          ? "no draft yet"
          : `${matter.drafts.length} draft${matter.drafts.length === 1 ? "" : "s"}`,
    },
  ];

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Hearing / next-action prep</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {prepItems.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                  item.done ? "bg-verified-600 text-white" : "bg-ink-100 text-ink-500"
                }`}
              >
                {item.done ? "✓" : "•"}
              </span>
              <div className="flex-1">
                <p className="text-sm text-ink-800">{item.label}</p>
                <p className="text-xs text-ink-400">{item.hint}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {matter.nextAction && (
        <Card>
          <CardHeader>
            <CardTitle>Suggested next action</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-ink-800">{matter.nextAction}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Statutory deadlines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {deadlines.length === 0 ? (
            <p className="text-sm text-ink-400">
              No statutory deadline rule matched the events in your timeline yet.
            </p>
          ) : (
            <>
              {upcoming.map((d) => (
                <div key={d.rule.calculation} className="rounded-md border border-amber-200 bg-amber-100/40 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-ink-900">{d.rule.action}</p>
                    <Badge tone="amber">
                      due {format(new Date(d.rule.dueDate), "d MMM yyyy")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-ink-500">
                    Triggered by “{d.event.title}” · {d.rule.statute}
                    {d.rule.section ? ` s.${d.rule.section}` : ""}
                  </p>
                  {d.rule.isLimitationBar && (
                    <p className="mt-1 text-xs font-medium text-critical-600">
                      This is a limitation bar — act before the date.
                    </p>
                  )}
                </div>
              ))}
              {passed.map((d) => (
                <div key={d.rule.calculation} className="rounded-md border border-critical-200 bg-critical-100/40 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-ink-900">{d.rule.action}</p>
                    <Badge tone="red">
                      passed {format(new Date(d.rule.dueDate), "d MMM yyyy")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-ink-500">
                    {d.rule.statute}
                    {d.rule.section ? ` s.${d.rule.section}` : ""} — seek legal advice.
                  </p>
                </div>
              ))}
            </>
          )}
          <p className="text-xs text-ink-400">
            Deadlines are calculated deterministically from statutory rules and
            shown for awareness — confirm with a lawyer.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
