import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { config } from "@/lib/config";

const SESSION_COOKIE = "nyayi_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function secretKey(): Uint8Array {
  if (!config.authSecret) {
    throw new Error("AUTH_SECRET is not configured.");
  }
  return new TextEncoder().encode(config.authSecret);
}

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("nyayi")
    .setAudience("nyayi-app")
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string
): Promise<{ uid: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: "nyayi",
      audience: "nyayi-app",
    });
    if (typeof payload.uid !== "string") return null;
    return { uid: payload.uid };
  } catch {
    return null;
  }
}

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  const isProd = process.env.NODE_ENV === "production";
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/** Resolve the authenticated user id from the request cookies, or null. */
export async function getSessionUserId(): Promise<string | null> {
  const token = await getSessionToken();
  if (!token) return null;
  const verified = await verifySessionToken(token);
  return verified?.uid ?? null;
}

export { SESSION_COOKIE };
