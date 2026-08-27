import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { matterCostInputs } from "@/lib/db/schema";
import type { CostOfDelayInput } from "./types";

/* =========================================================================
 * Cost-of-delay input store (server-only).
 *
 * Persists the user's own per-appearance figures. The Cost of Delay estimate
 * is shown only when these exist — never assumed.
 * ========================================================================= */

function numOrUndef(v: string | null): number | undefined {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function getCostInput(matterId: string): Promise<CostOfDelayInput | null> {
  const rows = await db
    .select()
    .from(matterCostInputs)
    .where(eq(matterCostInputs.matterId, matterId))
    .limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    dailyIncomeLost: numOrUndef(r.dailyIncomeLost),
    travelCostPerAppearance: numOrUndef(r.travelCostPerAppearance),
    otherCostPerAppearance: numOrUndef(r.otherCostPerAppearance),
    currency: r.currency,
  };
}

export async function upsertCostInput(
  matterId: string,
  input: CostOfDelayInput
): Promise<void> {
  const values = {
    matterId,
    dailyIncomeLost: input.dailyIncomeLost != null ? String(input.dailyIncomeLost) : null,
    travelCostPerAppearance:
      input.travelCostPerAppearance != null ? String(input.travelCostPerAppearance) : null,
    otherCostPerAppearance:
      input.otherCostPerAppearance != null ? String(input.otherCostPerAppearance) : null,
    currency: input.currency ?? "INR",
    updatedAt: new Date(),
  };
  await db
    .insert(matterCostInputs)
    .values(values)
    .onConflictDoUpdate({
      target: matterCostInputs.matterId,
      set: {
        dailyIncomeLost: values.dailyIncomeLost,
        travelCostPerAppearance: values.travelCostPerAppearance,
        otherCostPerAppearance: values.otherCostPerAppearance,
        currency: values.currency,
        updatedAt: values.updatedAt,
      },
    });
}
