import { requireApiUser } from "@/lib/auth";
import { getMatterDetail } from "@/lib/matters/service";
import { searchMatter } from "@/lib/workbench/search";

export async function GET(
  request: Request,
  ctx: unknown
) {
  const user = await requireApiUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const detail = await getMatterDetail(user.id, id);
  if (!detail) return Response.json({ ok: false, error: "Not found." }, { status: 404 });
  const result = searchMatter(detail as never, q);
  return Response.json({ ok: true, result });
}
