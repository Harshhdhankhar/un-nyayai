import { requireApiUser } from "@/lib/auth";
import { getMatter } from "@/lib/matters/service";
import { captureSnapshot } from "@/lib/intelligence/case-store";
import { safeHandler } from "@/lib/security";
import { rateLimit, rateLimitKey, clientIp } from "@/lib/security/rate-limit";
import { isCircuitOpen, recordSuccess, recordFailure, classifyProviderError, circuitBreakerKey } from "@/lib/providers/result";

async function handler(req: Request, ctx: unknown) {
  const user = await requireApiUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const limited = rateLimit(
    rateLimitKey(clientIp(req), user.id, "case-refresh"),
    10,
    60_000
  );
  if (!limited.ok) {
    return Response.json({ ok: false, error: "Too many refreshes. Please wait a moment." }, {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSeconds ?? 1) },
    });
  }

  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
  const matter = await getMatter(id);
  if (!matter || matter.userId !== user.id) {
    return Response.json({ ok: false, error: "Matter not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as { cnr?: string };
  const cnr = (body.cnr ?? matter.cnr ?? "").trim();
  if (!cnr) {
    return Response.json({ ok: false, error: "No CNR linked to this matter." }, { status: 400 });
  }

  // Circuit breaker: after repeated failures, skip automatic retries but let
  // the user still force a manual refresh (deliberate action).
  const breaker = circuitBreakerKey("ecourts", user.id);
  if (isCircuitOpen(breaker)) {
    return Response.json(
      { ok: false, error: "Court refresh is paused for a moment because the provider failed repeatedly. Please retry shortly.", kind: "RATE_LIMITED", retryable: true },
      { status: 503 }
    );
  }

  try {
    const { mode, snapshot } = await captureSnapshot(id, cnr);
    recordSuccess(breaker);
    return Response.json({ ok: true, mode, capturedAt: snapshot.capturedAt });
  } catch (cause) {
    recordFailure(breaker);
    const classified = classifyProviderError(cause, { configured: Boolean(process.env.ECOURTS_API_KEY), hadCached: true });
    return Response.json(
      { ok: false, error: classified.message, kind: classified.kind, retryable: classified.retryable, hadCached: classified.hadCached },
      { status: 502 }
    );
  }
}

export const POST = safeHandler(handler);
