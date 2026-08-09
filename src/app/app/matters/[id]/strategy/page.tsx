import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMatterDetail } from "@/lib/matters/service";
import { getMatterRouteWithSteps } from "@/lib/legal/routes";
import { StrategySteps } from "@/components/matter/strategy-steps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function MatterStrategyPage({
  params,
}: PageProps<"/app/matters/[id]/strategy">) {
  const user = await getCurrentUser();
  if (!user) return notFound();
  const { id } = await params;
  const matter = await getMatterDetail(user.id, id, { includeSteps: true });
  if (!matter) return notFound();

  const routes = await getMatterRouteWithSteps(id);
  const routeHeads = routes.filter(
    (row, index, all) => all.findIndex((item) => item.route.id === row.route.id) === index
  );
  const states = matter.routeSteps;

  const instanceForRoute = new Map<string, string>();
  for (const inst of matter.routes) instanceForRoute.set(inst.routeId, inst.id);

  const byInstance = new Map<string, Map<number, (typeof states)[number]["state"]>>();
  for (const row of states) {
    if (!row.state) continue;
    const instId = String(row.instance.id);
    if (!byInstance.has(instId)) byInstance.set(instId, new Map());
    byInstance.get(instId)!.set(row.state.stepOrder, row.state);
  }

  if (routes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-ink-200 bg-white py-16 text-center">
        <p className="text-sm text-ink-500">No legal route attached yet.</p>
        <p className="mt-1 text-xs text-ink-400">
          Run a triage with details and NyayAI will attach the most likely
          pathway.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="max-w-3xl">
        <p className="eyebrow text-navy-700">Procedural map</p>
        <h2 className="mt-2 font-serif-display text-3xl text-navy-950">NyayPath</h2>
        <p className="mt-2 text-sm leading-6 text-ink-600">Your route through this matter. Open a stage to see why it matters, what information supports it, and update its state.</p>
      </div>
      {routeHeads.map((row) => {
        const steps = routes
          .filter((r) => r.route.id === row.route.id)
          .map((r) => r.step);
        const stateMap = byInstance.get(instanceForRoute.get(row.route.id) ?? "") ?? new Map();
        return (
          <Card key={row.route.id} className="!rounded-none !border-0 !bg-transparent !shadow-none">
            <CardHeader>
              <CardTitle>{row.route.title}</CardTitle>
              {row.route.description && (
                <p className="text-sm text-ink-500">{row.route.description}</p>
              )}
            </CardHeader>
            <CardContent>
              <StrategySteps
                matterId={id}
                instanceId={instanceForRoute.get(row.route.id) ?? ""}
                steps={steps.map((s) => ({
                  order: s.order,
                  title: s.title,
                  whyItMatters: s.whyItMatters ?? undefined,
                  requiredDocuments: (s.requiredDocuments ?? []) as string[],
                  estDuration: s.explanation ?? undefined,
                  status: (stateMap.get(s.order)?.status ??
                    "NOT_STARTED") as never,
                  notes: stateMap.get(s.order)?.notes ?? undefined,
                }))}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
