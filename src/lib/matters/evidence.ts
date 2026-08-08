import "server-only";
import { db } from "@/lib/db/client";
import { evidenceItems, routeSteps, legalRoutes, matterRouteInstances } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/* =========================================================================
 * Evidence intelligence.
 * Builds an evidence checklist from the matter's route; flags missing and
 * available evidence. Phrasing is always "potentially useful" — never a
 * guarantee.
 * ========================================================================= */

export interface EvidenceChecklist {
  available: { title: string; source: string; suggested: boolean }[];
  missing: { title: string; whyRelevant: string; suggested: boolean }[];
  needsVerification: { title: string; note: string }[];
}

export async function buildEvidenceChecklist(matterId: string): Promise<EvidenceChecklist> {
  const [items, instances] = await Promise.all([
    db.select().from(evidenceItems).where(eq(evidenceItems.matterId, matterId)),
    db.select().from(matterRouteInstances).where(eq(matterRouteInstances.matterId, matterId)),
  ]);

  const available = items
    .filter((i) => i.status === "available")
    .map((i) => ({ title: i.title, source: i.provenance ?? "user", suggested: i.suggested }));

  const needsVerification = items
    .filter((i) => i.status === "needs_verification")
    .map((i) => ({ title: i.title, note: i.description ?? "Verify this item independently." }));

  // Required documents from the route steps.
  const requiredFromRoute: { title: string; whyRelevant: string }[] = [];
  for (const instance of instances) {
    const steps = await db
      .select()
      .from(routeSteps)
      .where(eq(routeSteps.routeId, instance.routeId))
      .orderBy(routeSteps.order);
    for (const step of steps) {
      for (const doc of (step.requiredDocuments ?? []) as string[]) {
        requiredFromRoute.push({ title: doc, whyRelevant: step.whyItMatters ?? "May be relevant for this step." });
      }
    }
  }

  const availableTitles = new Set(available.map((a) => a.title.toLowerCase()));
  const missing = requiredFromRoute
    .filter((r) => !availableTitles.has(r.title.toLowerCase()))
    .filter(
      (r, idx, arr) =>
        arr.findIndex((x) => x.title.toLowerCase() === r.title.toLowerCase()) === idx
    )
    .map((r) => ({ title: r.title, whyRelevant: r.whyRelevant, suggested: true }));

  return { available, missing, needsVerification };
}
