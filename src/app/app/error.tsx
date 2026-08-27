"use client";

import { useEffect } from "react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("workspace_render_failed", { digest: error.digest });
  }, [error]);

  return (
    <div className="workspace-page">
      <div className="mx-auto max-w-xl border border-critical-200 bg-white px-6 py-14 text-center">
        <p className="eyebrow text-critical-600">Workspace unavailable</p>
        <h1 className="mt-3 font-serif-display text-3xl text-navy-950">This section could not be loaded.</h1>
        <p className="mt-3 text-sm leading-6 text-ink-500">Your saved Matter data has not been changed. Try loading this section again.</p>
        <button type="button" onClick={reset} className="mt-6 min-h-11 bg-navy-950 px-5 text-sm font-semibold text-white">Try again</button>
      </div>
    </div>
  );
}
