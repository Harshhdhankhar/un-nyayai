import { getCurrentUser } from "@/lib/auth";
import { safeHandler } from "@/lib/security";
import { assessLegalAid, legalAidQuestionnaireSchema } from "@/lib/legal/aid";

async function handler(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = legalAidQuestionnaireSchema.parse(await req.json());
  const assessment = assessLegalAid(body);
  return Response.json({ ok: true, assessment });
}

export const POST = safeHandler(handler);
