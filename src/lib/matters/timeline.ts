import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { matterEvents } from "@/lib/db/schema";
import type { CaseSummary } from "@/lib/providers/ecourts/mapper";
import { logger } from "@/lib/logger";

export interface TimelineItem {
  id?: string;
  date: string;
  title: string;
  description: string;
  source: "user" | "document" | "ecourts" | "ai";
  confidence: number;
  editable: boolean;
}

/** Get the user/documented timeline for a matter, merged with eCourts data. */
export async function getTimeline(matterId: string): Promise<TimelineItem[]> {
  const events = await db
    .select()
    .from(matterEvents)
    .where(eq(matterEvents.matterId, matterId))
    .orderBy(matterEvents.eventDate);
  return events.map((e) => ({
    id: e.id,
    date: e.eventDate ?? "",
    title: e.title,
    description: e.description ?? "",
    source: e.source,
    confidence: Number(e.confidence ?? 0.8),
    editable: e.editable,
  }));
}

/** Merge eCourts case history into the matter timeline (deduplicated). */
export function mergeCaseTimeline(
  local: TimelineItem[],
  caseSummary: CaseSummary
): TimelineItem[] {
  const merged = [...local];
  const existingKeys = new Set(
    merged.map((i) => `${i.date}|${i.title}`.toLowerCase())
  );
  for (const item of caseSummary.timeline) {
    const key = `${item.date}|${item.title}`.toLowerCase();
    if (!existingKeys.has(key)) {
      merged.push(item);
      existingKeys.add(key);
    }
  }
  return merged.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export async function importCaseTimeline(matterId: string, caseSummary: CaseSummary) {
  let count = 0;
  for (const item of caseSummary.timeline) {
    if (item.source !== "ecourts") continue;
    try {
      await db.insert(matterEvents).values({
        matterId,
        eventDate: item.date || null,
        title: item.title,
        description: item.description,
        source: "ecourts",
        editable: false,
      });
      count++;
    } catch {
      // ignore duplicates
    }
  }
  logger.info("imported_case_timeline", { matterId, count });
  return count;
}
