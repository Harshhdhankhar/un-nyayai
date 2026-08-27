import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { runTriage } from "@/lib/legal/triage";
import { z } from "zod";

const triageRequestSchema = z.object({
  statement: z.string().min(3).max(4000),
  language: z.enum(["en", "hi", "hinglish"]).default("en"),
});

export async function POST(request: NextRequest) {
  const user = await requireApiUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const parsed = triageRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data." },
      { status: 400 }
    );
  }

  const result = await runTriage(parsed.data.statement);
  return Response.json({ ok: true, triage: result });
}
