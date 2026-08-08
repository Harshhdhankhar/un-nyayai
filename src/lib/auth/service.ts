import "server-only";
import { eq, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, profiles } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/security";
import { z } from "zod";
import crypto from "node:crypto";

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(1).max(120).optional(),
  role: z.enum(["citizen", "advocate"]).default("citizen"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type AuthResult =
  | { ok: true; user: { id: string; email: string; role: string } }
  | { ok: false; error: string };

export async function signupUser(
  input: z.infer<typeof signupSchema>
): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase();
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    return { ok: false, error: "An account with this email already exists." };
  }

  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash: hashPassword(input.password),
      fullName: input.fullName,
      role: input.role,
      provider: "local",
    })
    .returning({ id: users.id, email: users.email, role: users.role });

  await db.insert(profiles).values({
    userId: user.id,
    displayName: input.fullName ?? email.split("@")[0],
  });

  return { ok: true, user };
}

export async function loginUser(
  input: z.infer<typeof loginSchema>
): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase();
  const found = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (found.length === 0 || !found[0].passwordHash) {
    return { ok: false, error: "Invalid email or password." };
  }
  const valid = verifyPassword(input.password, found[0].passwordHash);
  if (!valid) {
    return { ok: false, error: "Invalid email or password." };
  }
  return {
    ok: true,
    user: { id: found[0].id, email: found[0].email, role: found[0].role },
  };
}

export async function getUserById(userId: string) {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      isDemo: users.isDemo,
      createdAt: users.createdAt,
      consentSigned: profiles.consentSigned,
      profileId: profiles.id,
      displayName: profiles.displayName,
      preferredLanguage: profiles.preferredLanguage,
      explanationMode: profiles.explanationMode,
      state: profiles.state,
    })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function createDemoUser(): Promise<{ id: string; email: string }> {
  const email = `demo-${crypto.randomBytes(4).toString("hex")}@nyayi.local`;
  const [user] = await db
    .insert(users)
    .values({
      email,
      fullName: "Demo User",
      role: "citizen",
      isDemo: true,
      passwordHash: hashPassword(crypto.randomBytes(16).toString("hex")),
    })
    .returning({ id: users.id, email: users.email });
  await db.insert(profiles).values({
    userId: user.id,
    displayName: "Demo User",
  });
  return user;
}
