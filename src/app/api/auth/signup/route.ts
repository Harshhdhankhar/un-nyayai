import { NextRequest } from "next/server";
import { signupUser, signupSchema } from "@/lib/auth/service";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { rateLimit, rateLimitKey, clientIp } from "@/lib/security/rate-limit";

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
}
