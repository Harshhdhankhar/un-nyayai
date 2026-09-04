import { NextRequest } from "next/server";
import { loginUser, loginSchema } from "@/lib/auth/service";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { rateLimit, rateLimitKey, clientIp } from "@/lib/security/rate-limit";
import { config } from "@/lib/config";

export async function POST(request: NextRequest) {
  const limited = rateLimit(
    rateLimitKey(clientIp(request), "anon", "login"),
    10,
    60_000
  );
  if (!limited.ok) {
    return Response.json(
      { ok: false, error: "Too many attempts. Please try again later." },
      { status: 429 }
    );
  }

  if (!config.authSecret) {
    console.error("[auth_login] AUTH_SECRET is not configured on the server.");
    return Response.json(
      { ok: false, error: "Server is not configured for sign-in yet. Please try again later." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: "Please enter a valid email and password." },
      { status: 400 }
    );
  }

  try {
    const result = await loginUser(parsed.data);
    if (!result.ok) {
      return Response.json({ ok: false, error: result.error }, { status: 401 });
    }

    const token = await createSessionToken(result.user.id);
    await setSessionCookie(token);

    return Response.json({
      ok: true,
      user: { id: result.user.id, email: result.user.email, role: result.user.role },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string }).code;
    const causeMsg = (err as { cause?: { message?: string } })?.cause?.message;
    console.error("[auth_login_failed]", { message: msg, code, causeMsg });
    const detail = causeMsg ?? msg;
    return Response.json(
      { ok: false, error: `Could not sign you in. ${detail}` },
      { status: 500 }
    );
  }
}
