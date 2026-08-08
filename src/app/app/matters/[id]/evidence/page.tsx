import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMatterDetail } from "@/lib/matters/service";
import { buildEvidenceChecklist } from "@/lib/matters/evidence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function MatterEvidencePage({
  params,
}: PageProps<"/app/matters/[id]/evidence">) {
  const user = await getCurrentUser();
  if (!user) return notFound();
  const { id } = await params;
  const matter = await getMatterDetail(user.id, id);
  if (!matter) return notFound();

  const checklist = await buildEvidenceChecklist(id);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>In your possession</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {checklist.available.length === 0 ? (
            <p className="text-sm text-ink-400">
              Nothing recorded yet. Upload documents or mark items as available.
            </p>
          ) : (
            checklist.available.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-ink-700">{item.title}</span>
                <Badge tone="green">
                  {item.suggested ? "suggested" : item.source}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Potentially useful to collect</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {checklist.missing.length === 0 ? (
            <p className="text-sm text-ink-400">
              Nothing suggested yet — attach a legal route to see documents that
              may be needed.
            </p>
          ) : (
            checklist.missing.map((item, i) => (
              <div key={i} className="rounded-md border border-ink-200 p-3">
                <p className="text-sm font-medium text-ink-900">{item.title}</p>
                <p className="mt-0.5 text-xs text-ink-500">{item.whyRelevant}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {checklist.needsVerification.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Verify independently</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {checklist.needsVerification.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <Badge tone="red">verify</Badge>
                <div>
                  <p className="font-medium text-ink-900">{item.title}</p>
                  <p className="text-xs text-ink-500">{item.note}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-ink-400 lg:col-span-2">
        Readiness is based on what is in this workspace — it is not a
        prediction of outcome.
      </p>
    </div>
  );
}
