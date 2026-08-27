import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";
import { securityHeaders } from "@/lib/security";

// Public paths never require a session.
const PUBLIC_PREFIXES = ["/login", "/signup", "/forgot-password", "/reset-password"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Session check for app routes (and api routes that need auth).
  const needsAuth = pathname.startsWith("/app") || pathname === "/api/assistant";

  let sessionUserId: string | null = null;
  const token = request.cookies.get("nyayi_session")?.value;
  if (token) {
    const verified = await verifySessionToken(token);
    sessionUserId = verified?.uid ?? null;
  }

  // Redirect unauthenticated visitors of /app to /login.
  if (needsAuth && !sessionUserId) {
    if (pathname.startsWith("/app")) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Authenticated users hitting auth pages go to the dashboard.
  if (sessionUserId && PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  // Protect /app and the assistant API; skip static assets.
  matcher: [
    "/",
    "/app/:path*",
    "/api/:path*",
    "/login/:path*",
    "/signup/:path*",
    "/forgot-password/:path*",
    "/reset-password/:path*",
  ],
};
