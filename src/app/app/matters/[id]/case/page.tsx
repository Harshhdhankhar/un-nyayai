import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Landmark } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMatterDetail } from "@/lib/matters/service";
import { lookupCaseByCnr } from "@/lib/providers/ecourts";
import { MatterCaseView } from "@/components/case-status/matter-case-view";

export default async function MatterCasePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return notFound();
  const { id } = await params;
  const matter = await getMatterDetail(user.id, id);
  if (!matter) return notFound();

  if (!matter.cnr) return <div className="mx-auto max-w-xl border border-dashed border-ink-300 px-6 py-14 text-center"><Landmark className="mx-auto h-6 w-6 text-ink-400" /><h2 className="mt-4 font-serif-display text-2xl text-navy-950">No court case linked</h2><p className="mt-2 text-sm leading-6 text-ink-500">Add a CNR to this Matter to see its official stage, listings, hearing history and orders.</p><Link href="/app/case-status" className="mt-6 inline-flex items-center gap-2 bg-navy-950 px-4 py-3 text-xs font-semibold text-white">Find a case <ArrowRight className="h-3.5 w-3.5" /></Link></div>;

  const { caseData, mode } = await lookupCaseByCnr(matter.cnr);
  return <MatterCaseView detail={caseData} mode={mode} />;
}
