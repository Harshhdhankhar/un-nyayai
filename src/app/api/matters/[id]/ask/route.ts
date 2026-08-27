import { requireApiUser } from "@/lib/auth";
import { buildCaseReasoning } from "@/lib/workbench/case-reasoning";
import { askMatter } from "@/lib/workbench/ask";

export async function POST(
  request: Request,
  ctx: unknown
) {
  const user = await requireApiUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;
  let body: { question?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  const question = (body.question ?? "").trim();
  if (!question) return Response.json({ ok: false, error: "A question is required." }, { status: 400 });
  const reasoning = await buildCaseReasoning(user.id, id);
  if (!reasoning) return Response.json({ ok: false, error: "Not found." }, { status: 404 });
  const result = askMatter(reasoning, question);
  return Response.json({ ok: true, result });
}
