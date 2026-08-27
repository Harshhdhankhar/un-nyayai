import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Circle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMatterDetail } from "@/lib/matters/service";
import { MatterTabs } from "@/components/matter/matter-tabs";
import { MatterSearch } from "@/components/matter/matter-search";

export default async function MatterLayout({ children, params }: LayoutProps<"/app/matters/[id]">) {
  const user = await getCurrentUser();
  if (!user) return notFound();
  const { id } = await params;
  const matter = await getMatterDetail(user.id, id);
  if (!matter) return notFound();

  return (
    <div className="workspace-page !max-w-[96rem]">
      <header className="mb-6">
        <Link href="/app/matters" className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-navy-950">
          <ArrowLeft className="h-3.5 w-3.5" /> All matters
        </Link>
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="eyebrow text-navy-700">Matter record</p>
              <span className="text-ink-300">/</span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-verified-700">
                <Circle className="h-1.5 w-1.5 fill-current" /> {matter.status}
              </span>
            </div>
            <h1 className="mt-3 max-w-4xl font-serif-display text-[clamp(1.9rem,4vw,3.4rem)] leading-tight tracking-[-0.025em] text-navy-950">{matter.title}</h1>
          </div>
          <dl className="grid grid-cols-2 gap-x-7 gap-y-2 border-l border-ink-200 pl-5 text-xs sm:grid-cols-3">
            <div><dt className="eyebrow">Category</dt><dd className="mt-1 capitalize text-ink-700">{matter.matterType}</dd></div>
            <div><dt className="eyebrow">Court / place</dt><dd className="mt-1 max-w-44 truncate text-ink-700">{matter.court ?? matter.jurisdiction ?? "Not recorded"}</dd></div>
            <div className="col-span-2 sm:col-span-1"><dt className="eyebrow">CNR</dt><dd className="mt-1 font-mono text-[11px] text-ink-700">{matter.cnr ?? "Not linked"}</dd></div>
          </dl>
        </div>
        <div className="mt-4 flex justify-end lg:mt-0"><MatterSearch matterId={id} /></div>
      </header>
      <MatterTabs matterId={id} />
      <div className="mt-7">{children}</div>
    </div>
  );
}
