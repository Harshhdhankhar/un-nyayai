import { getCurrentUser } from "@/lib/auth";
import { safeHandler, sanitizeText } from "@/lib/security";
import { addSource, getMatter } from "@/lib/matters/service";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1).max(500),
  type: z.string().default("other"),
  authority: z.string().max(240).optional(),
  citation: z.string().max(240).optional(),
  url: z.string().url().optional().or(z.literal("")),
  excerpt: z.string().max(2000).optional(),
  status: z.enum(["verified", "interpretation", "needs_verification"]).default("needs_verification"),
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
  const source = await addSource({
    matterId: id,
    title: sanitizeText(body.title),
    type: sanitizeText(body.type),
    authority: body.authority ? sanitizeText(body.authority) : undefined,
    citation: body.citation ? sanitizeText(body.citation) : undefined,
    url: body.url || undefined,
    excerpt: body.excerpt ? sanitizeText(body.excerpt) : undefined,
    status: body.status,
  });
  return Response.json({ ok: true, source }, { status: 201 });
}

export const POST = safeHandler(handler);
