import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function WorkspaceNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="eyebrow text-navy-700">Page not found</p>
        <h1 className="mt-3 font-serif-display text-3xl text-navy-950">We couldn&apos;t find that.</h1>
        <p className="mt-3 text-sm leading-6 text-ink-600">
          The page may have been moved, or the address may be wrong. Your matters and records are safe.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-900"
          >
            <ArrowLeft className="h-4 w-4" /> Back to workspace
          </Link>
          <Link href="/app/matters" className="text-sm font-semibold text-navy-800 underline-offset-4 hover:underline">
            View matters
          </Link>
        </div>
      </div>
    </div>
  );
}