import { NextRequest } from "next/server";
import { createDemoUser } from "@/lib/auth/service";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { rateLimit, rateLimitKey, clientIp } from "@/lib/security/rate-limit";
import { createMatter } from "@/lib/matters/service";

/**
 * One-click demo login for the hackathon. Creates a disposable demo user and
 * seeds the SCENARIO-1 deposit matter so the dashboard is never empty.
 */
export async function POST(request: NextRequest) {
  const limited = rateLimit(
    rateLimitKey(clientIp(request), "anon", "demo-login"),
    5,
    60_000
  );
  if (!limited.ok) {
    return Response.json(
      { ok: false, error: "Too many attempts. Please try again later." },
      { status: 429 }
    );
  }

  const demo = await createDemoUser();
  const token = await createSessionToken(demo.id);
  await setSessionCookie(token);

  const matter = await createMatter(demo.id, {
    title: "Security Deposit Dispute",
    description: "Landlord has not returned ₹40,000 security deposit after vacating the flat.",
    matterType: "property",
    subCategory: "security_deposit",
    jurisdiction: "Delhi",
    language: "en",
    facts: [
      { fact: "Paid ₹40,000 as security deposit for a rented flat in Delhi." },
      { fact: "Vacated the flat three weeks ago after completing the tenancy." },
      { fact: "Landlord has not returned the deposit despite verbal requests." },
    ],
    parties: [
      { name: "Demo User (tenant)", role: "self" },
      { name: "Landlord", role: "opposite_party" },
    ],
    events: [
      { eventDate: new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10), title: "Tenancy began / deposit paid" },
      { eventDate: new Date(Date.now() - 21 * 86400000).toISOString().slice(0, 10), title: "Flat vacated" },
    ],
  });

  await import("@/lib/matters/service").then((m) =>
    m.addTask({
      matterId: matter.id,
      title: "Send a written demand for the deposit",
      description: "A formal written demand is usually the first practical step before any legal route.",
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    })
  );

  return Response.json({
    ok: true,
    user: { id: demo.id, email: demo.email, role: "citizen", isDemo: true },
  });
}
