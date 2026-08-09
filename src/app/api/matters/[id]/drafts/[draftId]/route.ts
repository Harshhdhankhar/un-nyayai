import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getMatter } from "@/lib/matters/service";
import { updateDraft } from "@/lib/drafting/service";
import { safeHandler } from "@/lib/security";

const patchSchema = z.object({
  title: z.string().min(1).max(240).optional(),
  content: z.string().min(1).max(100_000).optional(),
  status: z.enum(["draft", "review", "final"]).optional(),
}).refine((value) => Object.keys(value).length > 0, "No changes provided.");

async function handler(req: Request, ctx: unknown) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { id, draftId } = await (ctx as { params: Promise<{ id: string; draftId: string }> }).params;
  const matter = await getMatter(id);
  if (!matter || matter.userId !== user.id) return Response.json({ ok: false, error: "Matter not found" }, { status: 404 });
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid changes" }, { status: 400 });
  const draft = await updateDraft(user.id, id, draftId, parsed.data);
  if (!draft) return Response.json({ ok: false, error: "Draft not found" }, { status: 404 });
  return Response.json({ ok: true, draft });
}

export const PATCH = safeHandler(handler);
