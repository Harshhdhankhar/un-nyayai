import { getCurrentUser } from "@/lib/auth";
import { safeHandler } from "@/lib/security";
import { getMatter, upsertStepState } from "@/lib/matters/service";
import { z } from "zod";

const schema = z.object({
  instanceId: z.string().uuid(),
  stepOrder: z.number().int().positive(),
  status: z.enum([
    "NOT_STARTED",
    "IN_PROGRESS",
    "COMPLETED",
    "BLOCKED",
    "NEEDS_INFORMATION",
  ]),
  notes: z.string().max(2000).optional(),
});

async function handler(req: Request, ctx: unknown) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
  const matter = await getMatter(id);
  if (!matter || matter.userId !== user.id) {
    return Response.json({ ok: false, error: "Matter not found" }, { status: 404 });
  }

  const body = schema.parse(await req.json());
  if (!matter.routes.some((instance) => instance.id === body.instanceId)) {
    return Response.json({ ok: false, error: "Route instance not found" }, { status: 404 });
  }
  const state = await upsertStepState(body.instanceId, body.stepOrder, body.status, body.notes);
  if (!state) {
    return Response.json({ ok: false, error: "Route instance not found" }, { status: 404 });
  }
  return Response.json({ ok: true, state });
}

export const PATCH = safeHandler(handler);
