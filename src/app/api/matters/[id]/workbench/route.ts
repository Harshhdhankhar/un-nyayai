import { requireApiUser } from "@/lib/auth";
import { buildCaseReasoning } from "@/lib/workbench/case-reasoning";

export async function GET(
  _request: Request,
  ctx: unknown
) {
  const user = await requireApiUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
  const reasoning = await buildCaseReasoning(user.id, id);
  if (!reasoning) return Response.json({ ok: false, error: "Not found." }, { status: 404 });
  return Response.json({ ok: true, reasoning });
}
