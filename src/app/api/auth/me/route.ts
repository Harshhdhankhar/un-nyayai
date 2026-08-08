import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, user: null }, { status: 401 });
  }
  return Response.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isDemo: user.isDemo,
      preferredLanguage: user.preferredLanguage,
      explanationMode: user.explanationMode,
    },
  });
}
