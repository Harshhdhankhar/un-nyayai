import { getCurrentUser } from "@/lib/auth";
import { safeHandler } from "@/lib/security";
import { rateLimit, rateLimitKey, clientIp } from "@/lib/security/rate-limit";
import { getMatter } from "@/lib/matters/service";
import { search as searchKanoon } from "@/lib/providers/indian-kanoon";
import {
  compileResearchIntent,
  rankAuthorities,
} from "@/lib/intelligence/research-compiler";
import { logger } from "@/lib/logger";

async function handler(req: Request, ctx: unknown) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const limited = rateLimit(
    rateLimitKey(clientIp(req), user.id, "matter-research"),
    30,
    60_000
  );
  if (!limited.ok) {
    return Response.json({ ok: false, error: "Too many requests. Please wait a moment." }, {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSeconds ?? 1) },
    });
  }
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
  const matter = await getMatter(id);
  if (!matter || matter.userId !== user.id) {
    return Response.json({ ok: false, error: "Matter not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const raw = (url.searchParams.get("q") ?? "").trim().slice(0, 300);
  if (!raw) {
    return Response.json({ ok: false, error: "Missing query." }, { status: 400 });
  }
  const page = Math.max(0, Number(url.searchParams.get("page") ?? "0") || 0);

  // Compile the natural-language ask into a structured, inspectable query
  // using Matter context (court / jurisdiction) so the user sees WHAT was
  // searched — and we never send a long question verbatim when a better
  // structured query can be built.
  const intent = compileResearchIntent(raw, {
    court: (matter as { court?: string | null }).court ?? null,
    jurisdiction: (matter as { jurisdiction?: string | null }).jurisdiction ?? null,
  });
  const q = intent.compiledQuery || raw;

  const { results, mode, failure } = await searchKanoon(q, {
    pagenum: page,
    fromdate: intent.fromDate || undefined,
    todate: intent.toDate || undefined,
    sortby: intent.toDate ? "date" : undefined,
  });

  // Transparent research relevance — a query-fit score, not a strength/win signal.
  const ranked = rankAuthorities(results, intent);

  logger.info("research_search", {
    matterId: id,
    raw,
    compiled: q,
    mode,
    page,
    count: results.length,
  });

  return Response.json({
    ok: true,
    results,
    ranked,
    intent,
    mode,
    failure: failure ?? null,
    page,
    hasMore: results.length >= 10,
  });
}

export const GET = safeHandler(handler);
