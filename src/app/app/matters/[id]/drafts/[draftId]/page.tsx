import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMatter } from "@/lib/matters/service";
import { getDraft as getOwnedDraft } from "@/lib/drafting/service";
import { Badge } from "@/components/ui/badge";

export default async function DraftDetailPage({
  params,
}: PageProps<"/app/matters/[id]/drafts/[draftId]">) {
  const user = await getCurrentUser();
  if (!user) return notFound();
  const { id, draftId } = await params;
  const matter = await getMatter(id);
  if (!matter || matter.userId !== user.id) return notFound();
  const draft = await getOwnedDraft(user.id, draftId);
  if (!draft) return notFound();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-navy-950">{draft.title}</h1>
          <p className="text-xs text-ink-400">{draft.kind}</p>
        </div>
        <Badge tone={draft.status === "final" ? "green" : "slate"}>{draft.status}</Badge>
      </div>
      <pre className="whitespace-pre-wrap rounded-md border border-ink-200 bg-white p-5 font-serif text-sm leading-relaxed text-ink-800">
        {draft.content}
      </pre>
      <p className="text-xs text-ink-400">
        Generated from facts in this workspace. Not a substitute for advice
        from a licensed lawyer — have it reviewed before filing.
      </p>
    </div>
  );
}
