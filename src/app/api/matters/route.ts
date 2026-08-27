import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { addTask, createMatter, createMatterSchema, findMatterByCnr, updateMatter } from "@/lib/matters/service";
import { attachBestRoute } from "@/lib/legal/routes";
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

  // Never import the same CNR twice into two separate Matters for one user.
  if (parsed.data.cnr) {
    const existing = await findMatterByCnr(user.id, parsed.data.cnr);
    if (existing) {
      return Response.json(
        {
          ok: true,
          matter: { id: existing.id },
          duplicate: true,
          nyayPathCreated: false,
        },
        { status: 200 }
      );
    }
  }

  const matter = await createMatter(user.id, parsed.data);
  const matchedRoute = await attachBestRoute(
    matter.id,
    parsed.data.matterType,
    parsed.data.subCategory,
    parsed.data.description
  );
  const firstStep = matchedRoute?.steps[0];
  if (firstStep) {
    await Promise.all([
      updateMatter(user.id, matter.id, { nextAction: firstStep.title }),
      addTask({
        matterId: matter.id,
        title: firstStep.title,
        description: firstStep.whyItMatters ?? undefined,
      }),
    ]);
  }
  logger.info("matter_created", { matterId: matter.id, userId: user.id });
  return Response.json({ ok: true, matter, nyayPathCreated: Boolean(matchedRoute) });
}

export async function GET() {
  const user = await requireApiUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const matters = await import("@/lib/matters/service").then((m) =>
    m.listMatters(user.id)
  );
  return Response.json({ ok: true, matters });
}
