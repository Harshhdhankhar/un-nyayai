import "server-only";
import { ilike } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { deadlineRules } from "@/lib/db/schema";
import { addDays, addMonths, addYears } from "date-fns";

export interface DeadlineResult {
  triggerEvent: string;
  action: string;
  dueDate: string; // ISO date
  statute: string;
  section: string | null;
  source: string;
  exceptions: string | null;
  isLimitationBar: boolean;
  calculation: string;
}

/**
 * Deterministic deadline calculation. The LLM is NEVER asked to compute legal
 * deadlines — it only explains the result of this code.
 */
export async function calculateDeadlineForEvent(
  triggerEvent: string,
  triggerDate: Date
): Promise<DeadlineResult | null> {
  const rule = await db
    .select()
    .from(deadlineRules)
    .where(ilike(deadlineRules.triggerEvent, `%${triggerEvent}%`))
    .limit(1);
  if (rule.length === 0) return null;
  return applyDeadlineRule(rule[0], triggerDate);
}

export function applyDeadlineRule(
  rule: {
    triggerEvent: string;
    action: string;
    duration: number;
    durationUnit: string;
    statute: string;
    section: string | null;
    source: string;
    exceptions: string | null;
    isLimitationBar: boolean;
  },
  triggerDate: Date
): DeadlineResult {
  let due: Date;
  switch (rule.durationUnit) {
    case "months":
      due = addMonths(triggerDate, rule.duration);
      break;
    case "years":
      due = addYears(triggerDate, rule.duration);
      break;
    default:
      due = addDays(triggerDate, rule.duration);
  }
  const calculation = `${triggerDate.toISOString().slice(0, 10)} + ${rule.duration} ${
    rule.durationUnit
  } (${rule.statute}${rule.section ? `, s.${rule.section}` : ""}) → ${due
    .toISOString()
    .slice(0, 10)}`;
  return {
    triggerEvent: rule.triggerEvent,
    action: rule.action,
    dueDate: due.toISOString().slice(0, 10),
    statute: rule.statute,
    section: rule.section,
    source: rule.source,
    exceptions: rule.exceptions,
    isLimitationBar: rule.isLimitationBar,
    calculation,
  };
}
