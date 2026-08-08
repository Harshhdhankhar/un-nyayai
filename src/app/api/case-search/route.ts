import { getCurrentUser } from "@/lib/auth";
import { safeHandler, sanitizeText } from "@/lib/security";
import { searchCases } from "@/lib/providers/ecourts";

async function handler(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const query = sanitizeText(url.searchParams.get("query") ?? "").slice(0, 120);
  const courtCodes = sanitizeText(url.searchParams.get("court") ?? "").slice(0, 40);
  const caseTypes = sanitizeText(url.searchParams.get("caseType") ?? "").slice(0, 40);
  const filingYears = sanitizeText(url.searchParams.get("year") ?? "").slice(0, 8);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);

  const { results, mode } = await searchCases({
    query: query || undefined,
    courtCodes: courtCodes || undefined,
    caseTypes: caseTypes || undefined,
    filingYears: filingYears || undefined,
    page,
  });

  return Response.json({
    ok: true,
    results: results.results,
    totalHits: results.totalHits,
    page: results.page,
    hasNextPage: results.hasNextPage,
    mode,
  });
}

export const GET = safeHandler(handler);
