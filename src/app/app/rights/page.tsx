import { RightsExplorer } from "@/components/rights/rights-explorer";

export const metadata = { title: "Know your rights" };

export default function RightsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-navy-950">
          Know your rights
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Describe what happened and see possible rights, remedies and official
          channels. Guidance only — never a guarantee of outcome.
        </p>
      </div>
      <RightsExplorer />
    </div>
  );
}
