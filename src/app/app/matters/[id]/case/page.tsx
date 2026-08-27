import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Landmark } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMatterDetail } from "@/lib/matters/service";
import { getLatestDetail } from "@/lib/intelligence/case-store";
import { MatterCaseView } from "@/components/case-status/matter-case-view";
import { CaseRefresh } from "@/components/case-status/case-refresh";
import { CompareOrders, type CompareOrderOption } from "@/components/case-status/compare-orders";

export default async function MatterCasePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return notFound();
  const { id } = await params;
  const matter = await getMatterDetail(user.id, id);
  if (!matter) return notFound();

  if (!matter.cnr) return <div className="mx-auto max-w-xl border border-dashed border-ink-300 px-6 py-14 text-center"><Landmark className="mx-auto h-6 w-6 text-ink-400" /><h2 className="mt-4 font-serif-display text-2xl text-navy-950">No court case linked</h2><p className="mt-2 text-sm leading-6 text-ink-500">Add a CNR to this Matter to see its official stage, listings, hearing history and orders.</p><Link href="/app/case-status" className="mt-6 inline-flex items-center gap-2 bg-navy-950 px-4 py-3 text-xs font-semibold text-white">Find a case <ArrowRight className="h-3.5 w-3.5" /></Link></div>;

  // Read the cached court record — never a live provider call on page load.
  const cached = await getLatestDetail(id);
  if (!cached) {
    return (
      <div className="space-y-5">
        <div className="rounded-lg border border-dashed border-ink-300 bg-white px-6 py-14 text-center">
          <Landmark className="mx-auto h-6 w-6 text-ink-400" />
          <h2 className="mt-4 font-serif-display text-2xl text-navy-950">Court record not loaded yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-500">
            Load the official record for {matter.cnr} on demand. NyayAI does not fetch court data automatically, so it loads instantly and only calls eCourts when you ask.
          </p>
        </div>
        <CaseRefresh matterId={id} cnr={matter.cnr} hasData={false} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <CaseRefresh matterId={id} cnr={matter.cnr} capturedAt={cached.capturedAt} hasData />
      <MatterCaseView detail={cached.detail} mode={cached.mode} />
      <OrderComparePanel orders={cached.detail.orders} />
    </div>
  );
}

function OrderComparePanel({ orders }: { orders: { orderDate: string; summary: string; orderType?: string | null }[] }) {
  const sorted = [...orders].sort((a, b) => (a.orderDate < b.orderDate ? -1 : 1));
  if (sorted.length < 2) return null;
  const options: CompareOrderOption[] = sorted.map((o, i) => ({
    key: `${o.orderDate}-${i}`,
    label: `${o.orderType ? `${o.orderType} — ` : ""}${o.orderDate || "Date unavailable"}`,
    text: `${o.orderType ?? ""} ${o.orderDate ?? ""} ${o.summary}`.trim(),
  }));
  return (
    <section className="rounded-lg border border-ink-200 bg-white p-5">
      <h2 className="font-serif-display text-lg text-navy-950">Compare orders</h2>
      <p className="mt-1 text-xs text-ink-500">Select two orders to see what changed between them, extracted from the court record.</p>
      <div className="mt-4">
        <CompareOrders options={options} />
      </div>
    </section>
  );
}
