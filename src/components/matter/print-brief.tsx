"use client";

import { Printer } from "lucide-react";

export function PrintBriefButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print-control inline-flex min-h-10 items-center gap-2 border border-ink-300 bg-white px-3 text-xs font-semibold text-ink-700"
    >
      <Printer className="h-4 w-4" />
      Print / export
    </button>
  );
}
