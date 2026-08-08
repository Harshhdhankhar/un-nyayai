import { getCurrentUser } from "@/lib/auth";
import { safeHandler, sanitizeText } from "@/lib/security";
import { addEvent, getMatter } from "@/lib/matters/service";
import { z } from "zod";

const schema = z.object({
  eventDate: z.string().optional().nullable(),
  title: z.string().min(1).max(240),
  description: z.string().max(4000).optional().nullable(),
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
  const event = await addEvent({
    matterId: id,
    eventDate: body.eventDate || undefined,
    title: sanitizeText(body.title),
    description: body.description ? sanitizeText(body.description) : undefined,
    source: "user",
  });
  return Response.json({ ok: true, event }, { status: 201 });
}

export const POST = safeHandler(handler);
