import { getCurrentUser } from "@/lib/auth";
import { safeHandler, sanitizeText } from "@/lib/security";
import { getRightsForSituation } from "@/lib/legal/rights";

async function handler(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as { situation?: unknown };
  const situation = sanitizeText(String(body.situation ?? ""));
  if (situation.length < 10) {
    return Response.json(
      { ok: false, error: "Please describe the situation in a bit more detail." },
      { status: 400 }
    );
  }
  const result = await getRightsForSituation(situation);
  return Response.json({ ok: true, result });
}

export const POST = safeHandler(handler);
