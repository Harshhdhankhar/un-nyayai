import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/app/app-shell";
import { listMatters } from "@/lib/matters/service";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/app");
  const matters = await listMatters(user.id);

  return (
    <AppShell
      user={{
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isDemo: user.isDemo,
      }}
      recentMatters={matters.slice(0, 4).map((matter) => ({
        id: matter.id,
        title: matter.title,
        matterType: matter.matterType,
      }))}
    >
      {children}
    </AppShell>
  );
}
