import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { createMatter, createMatterSchema } from "@/lib/matters/service";
import { rateLimit, rateLimitKey, clientIp } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const user = await requireApiUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const limited = rateLimit(
    rateLimitKey(clientIp(request), user.id, "matter-create"),
    30,
    60_000
  );
  if (!limited.ok) {
    return Response.json({ ok: false, error: "Too many requests." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const parsed = createMatterSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data." },
      { status: 400 }
    );
  }

  const matter = await createMatter(user.id, parsed.data);
  logger.info("matter_created", { matterId: matter.id, userId: user.id });
  return Response.json({ ok: true, matter });
}

export async function GET(request: NextRequest) {
  const user = await requireApiUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const matters = await import("@/lib/matters/service").then((m) =>
    m.listMatters(user.id)
  );
  return Response.json({ ok: true, matters });
}
