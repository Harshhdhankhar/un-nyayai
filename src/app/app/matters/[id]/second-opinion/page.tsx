import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMatterDetail } from "@/lib/matters/service";
import { SecondOpinion } from "@/components/matter/second-opinion";

export default async function SecondOpinionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(); if (!user) return notFound();
  const { id } = await params; const matter = await getMatterDetail(user.id, id); if (!matter) return notFound();
  const context = [matter.title, matter.matterType, matter.description, matter.jurisdiction, matter.court].filter(Boolean).join(" · ").slice(0, 1200);
  return <SecondOpinion matterId={id} matterContext={context} />;
}
