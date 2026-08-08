import { getCurrentUser } from "@/lib/auth";
import { safeHandler } from "@/lib/security";
import { getProviderCapabilities } from "@/lib/providers/capability-matrix";
import { checkKanoonHealth } from "@/lib/providers/indian-kanoon";
import { checkEcourtsHealth } from "@/lib/providers/ecourts";
import { logger } from "@/lib/logger";

async function handler() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const kanoonHealth = await checkKanoonHealth().catch((err) => ({
    ok: false,
    mode: "mock" as const,
    checkedAt: new Date().toISOString(),
    error: err instanceof Error ? err.message : String(err),
  }));

  const ecourtsHealth = await checkEcourtsHealth().catch((err) => ({
    ok: false,
    mode: "mock" as const,
    checkedAt: new Date().toISOString(),
    error: err instanceof Error ? err.message : String(err),
  }));

  const providers = getProviderCapabilities().map((p) => {
    if (p.id === "indian-kanoon") {
      return { ...p, health: kanoonHealth };
    }
    if (p.id === "groq") {
      return {
        ...p,
        health: {
          ok: p.configured,
          mode: p.configured ? ("live" as const) : ("unconfigured" as const),
          checkedAt: new Date().toISOString(),
        },
      };
    }
    if (p.id === "ecourts") {
      return { ...p, health: ecourtsHealth };
    }
    return {
      ...p,
      health: {
        ok: false,
        mode: "unverified" as const,
        checkedAt: new Date().toISOString(),
        note: "Not verified.",
      },
    };
  });

  logger.info("provider_status", { providers: providers.map((p) => p.id) });
  return Response.json({ ok: true, providers });
}

export const GET = safeHandler(handler);
