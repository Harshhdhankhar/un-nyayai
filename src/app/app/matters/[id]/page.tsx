import { redirect } from "next/navigation";

// The matter workspace lives under tab segments (overview, nyaypath, case, …).
// The bare /app/matters/[id] path has a layout but no view of its own, so send
// it to the Overview tab — the workspace's default landing surface.
export default async function MatterIndexPage({ params }: PageProps<"/app/matters/[id]">) {
  const { id } = await params;
  redirect(`/app/matters/${id}/overview`);
}
