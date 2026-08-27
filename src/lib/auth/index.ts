import "server-only";
import { getSessionUserId } from "./session";
import { getUserById } from "./service";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export { getSessionUserId, createSessionToken, verifySessionToken } from "./session";
export { signupUser, loginUser, getUserById } from "./service";

/** Current authenticated user (with profile), or null. */
export async function getCurrentUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return getUserById(userId);
}

/** Require an authenticated user inside an API route. Returns null when unauthenticated. */
export async function requireApiUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const user = await getUserById(userId);
  return user;
}

/** Mark profile consent as signed (privacy acknowledgment). */
export async function setConsentSigned(userId: string) {
  await db
    .update(users)
    .set({})
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  return true;
}
