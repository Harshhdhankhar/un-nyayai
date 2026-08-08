import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { getThread, getThreadMessages, deleteThread, renameThread } from "@/lib/matters/chat";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  ctx: RouteParams
) {
  const user = await requireApiUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const thread = await getThread(user.id, id);
  if (!thread) {
    return Response.json({ ok: false, error: "Not found." }, { status: 404 });
  }
  const messages = await getThreadMessages(id);
  return Response.json({ ok: true, thread, messages });
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteParams
) {
  const user = await requireApiUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const parsed = z.object({ title: z.string().min(1).max(100) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Title is required." }, { status: 400 });
  }
  const ok = await renameThread(user.id, id, parsed.data.title);
  if (!ok) return Response.json({ ok: false, error: "Not found." }, { status: 404 });
  return Response.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  ctx: RouteParams
) {
  const user = await requireApiUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const ok = await deleteThread(user.id, id);
  if (!ok) return Response.json({ ok: false, error: "Not found." }, { status: 404 });
  return Response.json({ ok: true });
}
