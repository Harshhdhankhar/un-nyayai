import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/app/app-shell";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/app");

  return (
    <AppShell
      user={{
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isDemo: user.isDemo,
      }}
    >
      {children}
    </AppShell>
  );
}
