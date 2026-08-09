import Link from "next/link";
import { ArrowRight, FolderOpen, Landmark } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listMatters } from "@/lib/matters/service";
import { LegalIntake } from "@/components/intake/legal-intake";
import { MatterCard } from "@/components/matter/matter-card";

export default async function AppHomePage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const matters = await listMatters(user.id);

  return (
    <div className="workspace-page">
      <section className="mx-auto max-w-5xl pt-4 sm:pt-8 lg:pt-12">
        <p className="eyebrow text-navy-700">Legal navigation</p>
        <h1 className="mt-4 max-w-3xl font-serif-display text-[clamp(2.5rem,6vw,5.4rem)] leading-[0.98] tracking-[-0.045em] text-navy-950">What happened?</h1>
        <p className="mb-8 mt-5 max-w-xl text-[15px] leading-7 text-ink-600 sm:text-base">
          Describe your situation in your own words. You don&apos;t need to know the law.
        </p>
        <LegalIntake />
      </section>

      {matters.length ? (
        <section className="mx-auto mt-16 max-w-5xl border-t border-ink-200 pt-8 sm:mt-20">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Continue your work</p>
              <h2 className="mt-2 font-serif-display text-2xl text-navy-950">Your matters</h2>
            </div>
            <Link href="/app/matters" className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-800 hover:underline">All matters <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {matters.slice(0, 4).map((matter) => (
              <MatterCard key={matter.id} matter={{
                id: matter.id,
                title: matter.title,
                matterType: matter.matterType,
                status: matter.status,
                nextAction: matter.nextAction,
                readinessScore: matter.readinessScore,
                court: matter.court,
                cnr: matter.cnr,
              }} />
            ))}
          </div>
        </section>
      ) : (
        <section className="mx-auto mt-14 grid max-w-5xl gap-px border-y border-ink-200 bg-ink-200 sm:grid-cols-2">
          <Link href="/app/case-status" className="group flex items-center gap-4 bg-paper py-6 pr-5 sm:px-6">
            <Landmark className="h-5 w-5 text-navy-800" />
            <span><span className="block text-sm font-semibold text-navy-950">Already have a court case?</span><span className="mt-1 block text-xs text-ink-500">Look it up using its CNR.</span></span>
            <ArrowRight className="ml-auto h-4 w-4 text-ink-400 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link href="/app/legal-aid" className="group flex items-center gap-4 bg-paper py-6 pl-5 sm:px-6">
            <FolderOpen className="h-5 w-5 text-navy-800" />
            <span><span className="block text-sm font-semibold text-navy-950">Need free legal help?</span><span className="mt-1 block text-xs text-ink-500">Check official legal-aid options.</span></span>
            <ArrowRight className="ml-auto h-4 w-4 text-ink-400 transition-transform group-hover:translate-x-1" />
          </Link>
        </section>
      )}
    </div>
  );
}
