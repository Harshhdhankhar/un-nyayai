"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";

/**
 * "Generate Draft Objection" from the Delay Analysis brief. Posts a
 * delay_objection draft seeded with the recorded hearing summary, then opens
 * the draft for review. Never asserts intentional delay — the template keeps
 * attribution neutral and is labelled DRAFT.
 */
export function GenerateDelayDraft({
  matterId,
  party,
  summaryLines,
}: {
  matterId: string;
  party: string | null;
  summaryLines: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/matters/${matterId}/drafts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "delay_objection",
          meta: {
            parties: party ? [{ name: party, role: "applicant" }] : [],
            amounts: [],
            dates: [],
            facts: summaryLines,
            laws: [],
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not generate the draft.");
      router.push(`/app/matters/${matterId}/drafts/${data.draft.id}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not generate the draft.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={generate}
        disabled={busy || summaryLines.length === 0}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-navy-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        Generate Draft Objection
      </button>
      {error ? <p role="alert" className="mt-2 text-xs text-critical-600">{error}</p> : null}
    </div>
  );
}
