import { NextRequest } from "next/server";
import { signupUser, signupSchema } from "@/lib/auth/service";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { rateLimit, rateLimitKey, clientIp } from "@/lib/security/rate-limit";
import { config } from "@/lib/config";

export async function POST(request: NextRequest) {
  const limited = rateLimit(
    rateLimitKey(clientIp(request), "anon", "signup"),
    10,
    60_000
  );
  if (!limited.ok) {
    return Response.json(
      { ok: false, error: "Too many attempts. Please try again later." },
      { status: 429 }
    );
  }

  // Surface misconfiguration clearly instead of throwing an opaque 500 after
  // the user row is already inserted. AUTH_SECRET is required to mint the
  // session token; DATABASE_URL must point at a reachable Postgres.
  if (!config.authSecret) {
    console.error("[auth_signup] AUTH_SECRET is not configured on the server.");
    return Response.json(
      { ok: false, error: "Server is not configured for sign-up yet. Please try again later." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data." },
      { status: 400 }
    );
  }

  try {
    const result = await signupUser(parsed.data);
    if (!result.ok) {
      return Response.json({ ok: false, error: result.error }, { status: 409 });
    }

    const token = await createSessionToken(result.user.id);
    await setSessionCookie(token);

    return Response.json({
      ok: true,
      user: { id: result.user.id, email: result.user.email, role: result.user.role },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[auth_signup_failed]", {
      message: msg,
      code: (err as { code?: string }).code,
      cause: (err as { cause?: { message?: string; code?: string } }).cause,
    });
    return Response.json(
      { ok: false, error: "Could not create your account. Please try again shortly." },
      { status: 500 }
    );
  }
}
