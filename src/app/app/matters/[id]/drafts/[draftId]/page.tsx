import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMatter } from "@/lib/matters/service";
import { getDraft } from "@/lib/drafting/service";
import { DraftEditor } from "@/components/drafting/draft-editor";
export default async function DraftDetailPage({ params }: PageProps<"/app/matters/[id]/drafts/[draftId]">) { const user = await getCurrentUser(); if (!user) return notFound(); const { id, draftId } = await params; const matter = await getMatter(id); if (!matter || matter.userId !== user.id) return notFound(); const draft = await getDraft(user.id, draftId); if (!draft || draft.matterId !== id) return notFound(); return <DraftEditor matterId={id} draft={{ id: draft.id, title: draft.title, content: draft.content, status: draft.status, kind: draft.kind }} />; }
