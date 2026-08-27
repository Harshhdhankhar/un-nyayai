"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * "Connect / refresh from eCourts" control. Reading the court record never
 * calls the provider automatically on page load — refreshing is an explicit
 * action so navigating a Matter stays fast and does not hammer eCourts.
 */
export function CaseRefresh({
  matterId,
  cnr,
  capturedAt,
  hasData,
}: {
  matterId: string;
  cnr: string;
  capturedAt?: string;
  hasData: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/matters/${matterId}/case/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cnr }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.kind === "TIMEOUT"
            ? hasData && capturedAt
              ? `Live court status is temporarily unavailable. Showing court information last checked ${format(new Date(capturedAt), "d MMM yyyy, HH:mm")}.`
              : "Live court status is temporarily unavailable. No previously saved record exists yet."
            : data.kind === "RATE_LIMITED"
              ? "Court refresh is rate-limited right now. Please wait a moment and retry."
              : data.error ?? "Refresh failed."
        );
      }
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Refresh failed. The court record may be unavailable right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 pb-5">
      <div>
        <p className="eyebrow text-navy-700">eCourts source</p>
        <p className="mt-1 text-xs leading-5 text-ink-500">
          {hasData
            ? capturedAt
              ? `Retrieved from eCourts ${format(new Date(capturedAt), "d MMM yyyy, HH:mm")}. Open this page without a network call — refresh below to check for changes.`
              : "Retrieved from eCourts."
            : "Not connected to eCourts yet. Load the official record on demand below — it is not fetched automatically."}
        </p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={refresh} loading={busy} className="shrink-0">
        {!busy && <RefreshCw className="h-3.5 w-3.5" />}
        {hasData ? "Refresh from eCourts" : "Connect to eCourts"}
      </Button>
      {error ? <p className="w-full text-xs text-critical-600">{error}</p> : null}
    </div>
  );
}