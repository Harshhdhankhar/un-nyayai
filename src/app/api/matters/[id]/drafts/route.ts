import { getCurrentUser } from "@/lib/auth";
import { safeHandler } from "@/lib/security";
import { getMatter } from "@/lib/matters/service";
import { saveDraft, draftMetaSchema, type DraftKind, draftKinds } from "@/lib/drafting/service";
import { templateBuilders } from "@/lib/drafting/templates";
import { z } from "zod";

const schema = z.object({
  kind: z.enum(draftKinds),
  meta: draftMetaSchema,
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
  const kind = body.kind as DraftKind;
  const builder = templateBuilders[kind];
  const title = builder.title(body.meta);
  const content = builder.body(body.meta);

  const draft = await saveDraft({
    userId: user.id,
    matterId: id,
    kind,
    title,
    content,
    meta: body.meta,
  });

  return Response.json({ ok: true, draft }, { status: 201 });
}

export const POST = safeHandler(handler);
