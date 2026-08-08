import { getCurrentUser } from "@/lib/auth";
import { safeHandler } from "@/lib/security";
import { getMatter } from "@/lib/matters/service";
import { search as searchKanoon } from "@/lib/providers/indian-kanoon";
import { logger } from "@/lib/logger";

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

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 300);
  if (!q) {
    return Response.json({ ok: false, error: "Missing query." }, { status: 400 });
  }
  const page = Math.max(0, Number(url.searchParams.get("page") ?? "0") || 0);
  const fromdate = (url.searchParams.get("fromdate") ?? "").slice(0, 10);
  const todate = (url.searchParams.get("todate") ?? "").slice(0, 10);
  const sortby = url.searchParams.get("sortby") === "date" ? "date" : undefined;

  const { results, mode } = await searchKanoon(q, {
    pagenum: page,
    fromdate: fromdate || undefined,
    todate: todate || undefined,
    sortby,
  });
  logger.info("research_search", {
    matterId: id,
    q,
    mode,
    page,
    count: results.length,
  });
  return Response.json({ ok: true, results, mode, page, hasMore: results.length >= 10 });
}

export const GET = safeHandler(handler);
