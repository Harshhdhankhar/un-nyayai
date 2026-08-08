import { getCurrentUser } from "@/lib/auth";
import { AccountSettings } from "@/components/settings/account-settings";
import { ProviderStatus } from "@/components/settings/provider-status";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy-950">
          Settings
        </h1>
        <p className="mt-1 text-sm text-ink-500">Manage your account.</p>
      </div>
      <ProviderStatus />
      <AccountSettings
        user={{
          id: user.id,
          email: user.email,
          fullName: user.fullName ?? "",
          role: user.role,
          isDemo: user.isDemo,
          consentSigned: user.consentSigned ?? false,
          createdAt: user.createdAt?.toISOString() ?? new Date().toISOString(),
        }}
      />
    </div>
  );
}
