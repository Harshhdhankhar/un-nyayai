import { getCurrentUser } from "@/lib/auth";
import { safeHandler } from "@/lib/security";
import { fetchDocument, fetchFragments } from "@/lib/providers/indian-kanoon";
import { logger } from "@/lib/logger";

async function handler(req: Request, ctx: unknown) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { tid } = await (ctx as { params: Promise<{ tid: string }> }).params;
  const id = Number(tid);
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ ok: false, error: "Invalid document id." }, { status: 400 });
  }

  const url = new URL(req.url);
  const fragmentQuery = (url.searchParams.get("query") ?? "").trim().slice(0, 200);

  const docResult = await fetchDocument(id);
  if (!docResult) {
    return Response.json({ ok: false, error: "Document not found." }, { status: 404 });
  }

  let fragments: string[] = [];
  if (fragmentQuery) {
    const frag = await fetchFragments(id, fragmentQuery);
    fragments = frag.fragments;
  }

  logger.info("research_doc", { tid: id, mode: docResult.mode, fragments: fragments.length });
  return Response.json({
    ok: true,
    doc: docResult.doc,
    fragments,
    mode: docResult.mode,
  });
}

export const GET = safeHandler(handler);
