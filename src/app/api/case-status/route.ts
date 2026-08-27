import { getCurrentUser } from "@/lib/auth";
import { safeHandler } from "@/lib/security";
import { rateLimit, rateLimitKey, clientIp } from "@/lib/security/rate-limit";
import { lookupCaseByCnr, mapCaseToSummary } from "@/lib/providers/ecourts";

async function handler(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const limited = rateLimit(
    rateLimitKey(clientIp(req), user.id, "case-status"),
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
  const cnr = (url.searchParams.get("cnr") ?? "").trim().toUpperCase();
  if (!cnr) {
    return Response.json({ ok: false, error: "CNR number is required." }, { status: 400 });
  }

  const { caseData, mode } = await lookupCaseByCnr(cnr);
  const summary = mapCaseToSummary(caseData);
  return Response.json({ ok: true, caseData, summary, mode });
}

export const GET = safeHandler(handler);
