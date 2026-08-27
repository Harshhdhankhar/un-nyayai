"use client";

import { useState } from "react";
import { CheckCircle2, PenLine } from "lucide-react";

const OUTCOMES = ["adjourned", "heard", "order", "part-heard", "reserved", "other"] as const;

export function PostHearingCapture({ matterId }: { matterId: string }) {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<(typeof OUTCOMES)[number]>("adjourned");
  const [hearingDate, setHearingDate] = useState("");
  const [nextHearingDate, setNextHearingDate] = useState("");
  const [whatHappened, setWhatHappened] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError("");
    try {
      const res = await fetch(`/api/matters/${matterId}/post-hearing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hearingDate, outcome, whatHappened, nextHearingDate }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus("error");
        setError(data?.error ?? "Could not save the note.");
        return;
      }
      setStatus("saved");
      setWhatHappened("");
      setNextHearingDate("");
    } catch {
      setStatus("error");
      setError("Could not reach the server.");
    }
  }

  return (
    <div className="rounded-lg border border-ink-200 bg-white p-5">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-navy-950 px-4 py-2.5 text-xs font-semibold text-white hover:bg-navy-800"
        >
          <PenLine className="h-3.5 w-3.5" /> Record a hearing note
        </button>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-navy-950">Post-hearing note</p>
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-ink-500 hover:text-ink-700">Cancel</button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs">
              <span className="mb-1 block font-semibold text-ink-600">Hearing date</span>
              <input type="date" value={hearingDate} onChange={(e) => setHearingDate(e.target.value)} className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs">
              <span className="mb-1 block font-semibold text-ink-600">Outcome</span>
              <select value={outcome} onChange={(e) => setOutcome(e.target.value as (typeof OUTCOMES)[number])} className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm">
                {OUTCOMES.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
          </div>

          <label className="block text-xs">
            <span className="mb-1 block font-semibold text-ink-600">What happened</span>
            <textarea value={whatHappened} onChange={(e) => setWhatHappened(e.target.value)} required rows={3} className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm" placeholder="e.g. Adjourned because the other side sought time. Next date fixed." />
          </label>

          <label className="block text-xs">
            <span className="mb-1 block font-semibold text-ink-600">Next hearing date (as you recorded it)</span>
            <input type="date" value={nextHearingDate} onChange={(e) => setNextHearingDate(e.target.value)} className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm" />
          </label>

          {status === "saved" && (
            <p className="flex items-center gap-1.5 text-sm text-verified-700"><CheckCircle2 className="h-4 w-4" /> Saved. It is marked as a user-provided note until verified against the court record.</p>
          )}
          {status === "error" && <p className="text-sm text-critical-600">{error}</p>}

          <button type="submit" disabled={status === "saving"} className="rounded-md bg-navy-950 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
            {status === "saving" ? "Saving…" : "Save hearing note"}
          </button>
        </form>
      )}
    </div>
  );
}