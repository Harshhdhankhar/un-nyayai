import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMatterDetail } from "@/lib/matters/service";
import { MatterTabs } from "@/components/matter/matter-tabs";

export default async function MatterLayout({
  children,
  params,
}: LayoutProps<"/app/matters/[id]">) {
  const user = await getCurrentUser();
  if (!user) return notFound();
  const { id } = await params;
  const matter = await getMatterDetail(user.id, id);
  if (!matter) return notFound();

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-4 border-b border-ink-200 pb-4">
        <div className="mb-1 flex flex-wrap items-baseline gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-navy-950">
            {matter.title}
          </h1>
          <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-600 capitalize">
            {matter.status}
          </span>
        </div>
        <p className="text-sm text-ink-500">
          {[matter.court, matter.jurisdiction, matter.cnr]
            .filter(Boolean)
            .join(" · ") || matter.matterType}
        </p>
      </div>
      <MatterTabs matterId={id} />
      <div className="mt-4">{children}</div>
    </div>
  );
}
