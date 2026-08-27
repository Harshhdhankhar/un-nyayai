import { getCurrentUser } from "@/lib/auth";
import { safeHandler, sanitizeText } from "@/lib/security";
import { rateLimit, rateLimitKey, clientIp } from "@/lib/security/rate-limit";
import { search as searchKanoon, searchStructured } from "@/lib/providers/indian-kanoon";

async function handler(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const limited = rateLimit(
    rateLimitKey(clientIp(req), user.id, "research"),
    30,
    60_000
  );
  if (!limited.ok) {
    return Response.json({ ok: false, error: "Too many requests. Please wait a moment." }, {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSeconds ?? 1) },
    });
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

  // Natural-language mode: let the structurer derive the query and date
  // filters from the user's question. Explicit filters win when provided.
  const out = fromdate || todate
    ? await searchKanoon(q, { pagenum: page, fromdate: fromdate || undefined, todate: todate || undefined, sortby })
    : await searchStructured(q, page);

  const { results, mode, failure } = out;
  return Response.json({
    ok: true,
    results,
    mode,
    failure: failure ?? null,
    page,
    hasMore: results.length >= 10,
  });
}

export const GET = safeHandler(handler);
