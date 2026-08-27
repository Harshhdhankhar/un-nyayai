import { getCurrentUser } from "@/lib/auth";
import { safeHandler, sanitizeText } from "@/lib/security";
import { addEvent, getMatter } from "@/lib/matters/service";
import { z } from "zod";

const HEARING_OUTCOMES = ["adjourned", "heard", "order", "part-heard", "reserved", "other"] as const;

const schema = z.object({
  hearingDate: z.string().optional().nullable(),
  outcome: z.enum(HEARING_OUTCOMES),
  whatHappened: z.string().min(1).max(4000),
  nextHearingDate: z.string().optional().nullable(),
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
  const safe = sanitizeText(body.whatHappened);
  const parts = [
    `Hearing note (user-provided, not yet verified against the court record).`,
    `Recorded outcome: ${body.outcome}.`,
    safe,
    body.nextHearingDate ? `Next hearing (as you recorded): ${body.nextHearingDate}.` : null,
  ].filter(Boolean);

  const event = await addEvent({
    matterId: id,
    eventDate: body.hearingDate || undefined,
    title: `USER-PROVIDED HEARING NOTE — ${body.outcome}`,
    description: parts.join("\n"),
    source: "user",
  });

  return Response.json({ ok: true, event }, { status: 201 });
}

export const POST = safeHandler(handler);