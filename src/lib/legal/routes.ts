import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  legalRoutes,
  routeSteps,
  matterRouteInstances,
} from "@/lib/db/schema";
import type { LegalCategory } from "@/lib/legal/schemas";
import { attachRouteToMatter } from "@/lib/matters/service";

export interface MatchedRoute {
  route: typeof legalRoutes.$inferSelect;
  steps: (typeof routeSteps.$inferSelect)[];
  matchScore: number;
}

/**
 * Find candidate legal routes for a triage result.
 * Deterministic: matches on category + subCategory first, then situation keywords.
 */
export async function findRoutesForCategory(
  category: LegalCategory,
  subCategory?: string,
  statement?: string
): Promise<MatchedRoute[]> {
  const rows = await db
    .select()
    .from(legalRoutes)
    .where(eq(legalRoutes.category, category));
  const matched: MatchedRoute[] = [];
  for (const route of rows) {
    let score = 0;
    const sub = subCategory ?? "";
    const text = statement ?? "";
    if (sub && route.subCategory === sub) score += 3;
    const keywords: string[] = (route.situationKeywords ?? []) as string[];
    for (const kw of keywords) {
      if (text.toLowerCase().includes(kw.toLowerCase())) score += 1;
    }
    if (score > 0) {
      const steps = await db
        .select()
        .from(routeSteps)
        .where(eq(routeSteps.routeId, route.id))
        .orderBy(routeSteps.order);
      matched.push({ route, steps, matchScore: score });
    }
  }
  return matched.sort((a, b) => b.matchScore - a.matchScore);
}

/** Attach the best matching route to a matter and initialize step states. */
export async function attachBestRoute(
  matterId: string,
  category: LegalCategory,
  subCategory?: string,
  statement?: string
): Promise<MatchedRoute | null> {
  const matches = await findRoutesForCategory(category, subCategory, statement);
  if (matches.length === 0) return null;
  const best = matches[0];
  await attachRouteToMatter(matterId, best.route.id);
  return best;
}

export async function getMatterRouteWithSteps(matterId: string) {
  const rows = await db
    .select({
      route: legalRoutes,
      step: routeSteps,
    })
    .from(matterRouteInstances)
    .innerJoin(legalRoutes, eq(legalRoutes.id, matterRouteInstances.routeId))
    .innerJoin(routeSteps, eq(routeSteps.routeId, legalRoutes.id))
    .where(eq(matterRouteInstances.matterId, matterId))
    .orderBy(routeSteps.order);
  return rows;
}
