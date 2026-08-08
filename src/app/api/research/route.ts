import { getCurrentUser } from "@/lib/auth";
import { safeHandler, sanitizeText } from "@/lib/security";
import { search as searchKanoon } from "@/lib/providers/indian-kanoon";

async function handler(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const q = sanitizeText(url.searchParams.get("q") ?? "").slice(0, 300);
  if (!q) {
    return Response.json({ ok: false, error: "Missing query." }, { status: 400 });
  }
  const page = Math.max(0, Number(url.searchParams.get("page") ?? "0") || 0);
  const fromdate = sanitizeText(url.searchParams.get("fromdate") ?? "").slice(0, 10);
  const todate = sanitizeText(url.searchParams.get("todate") ?? "").slice(0, 10);
  const sortby =
    url.searchParams.get("sortby") === "date" ? "date" : undefined;

  const { results, mode } = await searchKanoon(q, {
    pagenum: page,
    fromdate: fromdate || undefined,
    todate: todate || undefined,
    sortby,
  });
  return Response.json({
    ok: true,
    results,
    mode,
    page,
    hasMore: results.length >= 10,
  });
}

export const GET = safeHandler(handler);
