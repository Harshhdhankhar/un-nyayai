import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { getMatterDetail } from "@/lib/matters/service";

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/matters/[id]">
) {
  const user = await requireApiUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const detail = await getMatterDetail(user.id, id, { includeSteps: true });
  if (!detail) {
    return Response.json({ ok: false, error: "Not found." }, { status: 404 });
  }
  return Response.json({ ok: true, matter: detail });
}
