import { getCurrentUser } from "@/lib/auth";
import { safeHandler, sanitizeText } from "@/lib/security";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  fullName: z.string().min(1).max(120),
});

async function handler(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = schema.parse(await req.json());
  const [updated] = await db
    .update(users)
    .set({ fullName: sanitizeText(body.fullName), updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .returning({ id: users.id, fullName: users.fullName });
  return Response.json({ ok: true, user: updated });
}

export const PATCH = safeHandler(handler);
