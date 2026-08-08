import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  matters,
  matterParties,
  matterFacts,
  matterEvents,
  matterTasks,
  matterNotes,
  matterSources,
  documents,
  evidenceItems,
  drafts,
  matterRouteInstances,
  matterRouteStepStates,
} from "@/lib/db/schema";
import type { LegalCategory } from "@/lib/legal/schemas";
import { z } from "zod";

export const createMatterSchema = z.object({
  title: z.string().min(1).max(240),
  description: z.string().max(4000).optional(),
  matterType: z.enum([
    "employment", "civil", "criminal", "consumer", "property", "family",
    "cyber", "commercial", "constitutional", "other",
  ]).default("other"),
  subCategory: z.string().max(120).optional(),
  jurisdiction: z.string().max(120).optional(),
  court: z.string().max(240).optional(),
  cnr: z.string().max(80).optional(),
  language: z.enum(["en", "hi", "hinglish"]).default("en"),
  facts: z.array(z.object({ fact: z.string().min(1) })).default([]),
  parties: z
    .array(
      z.object({
        name: z.string().min(1),
        role: z.string().default("other"),
      })
    )
    .default([]),
  events: z
    .array(
      z.object({
        eventDate: z.string().optional(),
        title: z.string().min(1),
        description: z.string().optional(),
      })
    )
    .default([]),
});

export type CreateMatterInput = z.infer<typeof createMatterSchema>;

export async function createMatter(userId: string, input: CreateMatterInput) {
  const facts = input.facts ?? [];
  const parties = input.parties ?? [];
  const events = input.events ?? [];
  const [matter] = await db
    .insert(matters)
    .values({
      userId,
      title: input.title,
      description: input.description,
      matterType: input.matterType,
      subCategory: input.subCategory,
      jurisdiction: input.jurisdiction,
      court: input.court,
      cnr: input.cnr,
      language: input.language,
      status: "active",
    })
    .returning();

  for (const f of facts) {
    await db.insert(matterFacts).values({ matterId: matter.id, fact: f.fact });
  }
  for (const p of parties) {
    await db
      .insert(matterParties)
      .values({ matterId: matter.id, name: p.name, role: p.role as never });
  }
  for (const ev of events) {
    await db
      .insert(matterEvents)
      .values({
        matterId: matter.id,
        eventDate: ev.eventDate || null,
        title: ev.title,
        description: ev.description,
        source: "user",
      });
  }

  return matter;
}

export async function getMatter(matterId: string) {
  const matter = await db
    .select()
    .from(matters)
    .where(eq(matters.id, matterId))
    .limit(1);
  if (matter.length === 0) return null;
  const id = matter[0].id;

  const [parties, facts, events, tasks, notes, sources, docs, evd, dfts, routes] =
    await Promise.all([
      db.select().from(matterParties).where(eq(matterParties.matterId, id)),
      db.select().from(matterFacts).where(eq(matterFacts.matterId, id)),
      db.select().from(matterEvents).where(eq(matterEvents.matterId, id)).orderBy(desc(matterEvents.eventDate)),
      db.select().from(matterTasks).where(eq(matterTasks.matterId, id)),
      db.select().from(matterNotes).where(eq(matterNotes.matterId, id)),
      db.select().from(matterSources).where(eq(matterSources.matterId, id)),
      db.select().from(documents).where(eq(documents.matterId, id)),
      db.select().from(evidenceItems).where(eq(evidenceItems.matterId, id)),
      db.select().from(drafts).where(eq(drafts.matterId, id)),
      db.select().from(matterRouteInstances).where(eq(matterRouteInstances.matterId, id)),
    ]);

  return {
    ...matter[0],
    parties,
    facts,
    events,
    tasks,
    notes,
    sources,
    documents: docs,
    evidence: evd,
    drafts: dfts,
    routes,
  };
}

export async function getMatterDetail(
  userId: string,
  matterId: string,
  options?: { includeSteps?: boolean }
) {
  const owned = await db
    .select()
    .from(matters)
    .where(and(eq(matters.id, matterId), eq(matters.userId, userId)))
    .limit(1);
  if (owned.length === 0) return null;
  const detail = await getMatter(matterId);
  if (!detail) return null;

  let routeSteps: Awaited<ReturnType<typeof getRouteStepsForMatter>> = [];
  if (options?.includeSteps) {
    routeSteps = await getRouteStepsForMatter(matterId);
  }
  return { ...detail, routeSteps };
}

export async function listMatters(userId: string) {
  const rows = await db
    .select()
    .from(matters)
    .where(eq(matters.userId, userId))
    .orderBy(desc(matters.updatedAt));
  return rows;
}

export async function updateMatter(
  userId: string,
  matterId: string,
  patch: Partial<{
    title: string;
    description: string;
    court: string;
    cnr: string;
    jurisdiction: string;
    status: "triage" | "active" | "paused" | "closed";
    nextAction: string;
  }>
) {
  const owned = await db
    .select({ id: matters.id })
    .from(matters)
    .where(and(eq(matters.id, matterId), eq(matters.userId, userId)))
    .limit(1);
  if (owned.length === 0) return null;
  const [updated] = await db
    .update(matters)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(matters.id, matterId))
    .returning();
  return updated;
}

export async function deleteMatter(userId: string, matterId: string) {
  const owned = await db
    .select({ id: matters.id })
    .from(matters)
    .where(and(eq(matters.id, matterId), eq(matters.userId, userId)))
    .limit(1);
  if (owned.length === 0) return false;
  await db.delete(matters).where(eq(matters.id, matterId));
  return true;
}

export async function setReadinessScore(matterId: string, score: number) {
  await db
    .update(matters)
    .set({ readinessScore: score, updatedAt: new Date() })
    .where(eq(matters.id, matterId));
}

/* ---------------------------- sub-resources ----------------------------- */

export async function addFact(
  matterId: string,
  fact: string,
  kind: "statement" | "extracted" | "missing" = "statement"
) {
  const [row] = await db
    .insert(matterFacts)
    .values({ matterId, fact, kind })
    .returning();
  return row;
}

export async function addEvent(input: {
  matterId: string;
  eventDate?: string;
  title: string;
  description?: string;
  source?: "user" | "document" | "ecourts" | "ai";
}) {
  const [row] = await db
    .insert(matterEvents)
    .values({
      matterId: input.matterId,
      eventDate: input.eventDate || null,
      title: input.title,
      description: input.description,
      source: (input.source ?? "user") as never,
    })
    .returning();
  return row;
}

export async function addTask(input: {
  matterId: string;
  title: string;
  description?: string;
  dueDate?: string;
}) {
  const [row] = await db
    .insert(matterTasks)
    .values({
      matterId: input.matterId,
      title: input.title,
      description: input.description,
      dueDate: input.dueDate || null,
    })
    .returning();
  return row;
}

export async function updateTaskStatus(
  matterId: string,
  taskId: string,
  status: "todo" | "in_progress" | "done"
) {
  const [row] = await db
    .update(matterTasks)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(matterTasks.id, taskId), eq(matterTasks.matterId, matterId)))
    .returning();
  return row ?? null;
}

export async function addNote(matterId: string, userId: string, body: string) {
  const [row] = await db
    .insert(matterNotes)
    .values({ matterId, createdBy: userId, body })
    .returning();
  return row;
}

export async function addSource(input: {
  matterId: string;
  title: string;
  type: string;
  authority?: string;
  citation?: string;
  url?: string;
  excerpt?: string;
  status?: "verified" | "interpretation" | "needs_verification";
}) {
  const [row] = await db
    .insert(matterSources)
    .values({
      matterId: input.matterId,
      title: input.title,
      type: input.type as never,
      authority: input.authority,
      citation: input.citation,
      url: input.url,
      excerpt: input.excerpt,
      status: (input.status ?? "needs_verification") as never,
      retrievedAt: new Date(),
    })
    .returning();
  return row;
}

export async function attachRouteToMatter(matterId: string, routeId: string) {
  const [instance] = await db
    .insert(matterRouteInstances)
    .values({ matterId, routeId })
    .onConflictDoNothing()
    .returning();
  return instance ?? null;
}

export async function getRouteStepsForMatter(matterId: string) {
  const rows = await db
    .select({
      instance: matterRouteInstances,
      state: matterRouteStepStates,
    })
    .from(matterRouteInstances)
    .leftJoin(
      matterRouteStepStates,
      eq(matterRouteStepStates.instanceId, matterRouteInstances.id)
    )
    .where(eq(matterRouteInstances.matterId, matterId));
  return rows;
}

export async function upsertStepState(
  instanceId: string,
  stepOrder: number,
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED" | "NEEDS_INFORMATION",
  notes?: string
) {
  const existing = await db
    .select({ id: matterRouteStepStates.id })
    .from(matterRouteStepStates)
    .where(
      and(
        eq(matterRouteStepStates.instanceId, instanceId),
        eq(matterRouteStepStates.stepOrder, stepOrder)
      )
    )
    .limit(1);
  if (existing.length > 0) {
    const [row] = await db
      .update(matterRouteStepStates)
      .set({
        status: status as never,
        notes,
        updatedAt: new Date(),
        completedAt: status === "COMPLETED" ? new Date() : null,
      })
      .where(eq(matterRouteStepStates.id, existing[0].id))
      .returning();
    return row;
  }
  const [row] = await db
    .insert(matterRouteStepStates)
    .values({ instanceId, stepOrder, status: status as never, notes })
    .returning();
  return row;
}
