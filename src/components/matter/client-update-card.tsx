"use client";

import { useState } from "react";
import { Check, ClipboardCopy, ChevronDown } from "lucide-react";

/** Copy/exportable plain-language client update (Section 50). Pure, source-backed,
 * generated on the server — this component only handles display + copy/export. */
export function ClientUpdateCard({ plainText }: { plainText: string }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — leave plain text visible for manual copy */
    }
  }

  function download() {
    const blob = new Blob([plainText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "client-update.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="border border-ink-200 bg-white p-5">
      <div className="mb-3">
        <h2 className="eyebrow text-navy-700">Client update</h2>
        <p className="mt-1 text-xs leading-5 text-ink-500">
          A short, copyable update drawn from the recorded case data. No spin or predictions.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded border border-navy-900 bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-navy-950"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy update"}
        </button>
        <button
          type="button"
          onClick={download}
          className="inline-flex items-center gap-1.5 rounded border border-ink-300 px-3 py-1.5 text-xs font-semibold text-navy-900 transition-colors hover:bg-ink-50"
        >
          Export .txt
        </button>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="inline-flex items-center gap-1.5 rounded px-2 py-1.5 text-xs font-semibold text-navy-800 transition-colors hover:bg-ink-100"
        >
          {expanded ? "Hide" : "Preview"}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>
      {expanded ? (
        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded border border-ink-200 bg-ink-50/60 p-3 font-sans text-xs leading-6 text-ink-700">
          {plainText}
        </pre>
      ) : null}
      <p className="mt-3 border-t border-ink-100 pt-3 text-[11px] leading-4 text-ink-400">
        Verify dates and directions against the court file before sending. This is not legal advice.
      </p>
    </section>
  );
}
