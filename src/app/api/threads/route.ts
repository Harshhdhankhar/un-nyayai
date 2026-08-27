import { requireApiUser } from "@/lib/auth";
import { listThreads } from "@/lib/matters/chat";

export async function GET() {
  const user = await requireApiUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const threads = await listThreads(user.id);
  return Response.json({ ok: true, threads });
}
