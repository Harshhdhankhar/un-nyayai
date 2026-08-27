"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CaseStatusLookup } from "@/components/case-status/case-status-lookup";
import { CaseSearch } from "@/components/case-status/case-search";

function CaseStatusPageInner() {
  const params = useSearchParams();
  const [mode, setMode] = useState<"cnr" | "search">(params.get("tab") === "search" ? "search" : "cnr");
  const [externalCnr, setExternalCnr] = useState<string | undefined>();
  const [lookupToken, setLookupToken] = useState(0);

  function openCnr(cnr: string) {
    setExternalCnr(cnr);
    setLookupToken((t) => t + 1);
    setMode("cnr");
  }

  return (
    <div className="workspace-page">
      <header className="max-w-3xl">
        <p className="eyebrow text-navy-700">eCourts case record</p>
        <h1 className="mt-3 font-serif-display text-4xl text-navy-950 sm:text-5xl">
          Understand where a case stands.
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-600">
          Find the official listing, stage and hearing history. Provider provenance stays visible.
        </p>
      </header>
      <div className="mt-8">
        <div className="mb-6 flex border-b border-ink-300">
          <button
            onClick={() => setMode("cnr")}
            className={`relative px-4 py-3 text-xs font-semibold after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 ${mode === "cnr" ? "text-navy-950 after:bg-navy-950" : "text-ink-500 after:bg-transparent"}`}
          >
            Search by CNR
          </button>
          <button
            onClick={() => setMode("search")}
            className={`relative px-4 py-3 text-xs font-semibold after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 ${mode === "search" ? "text-navy-950 after:bg-navy-950" : "text-ink-500 after:bg-transparent"}`}
          >
            Search by details
          </button>
        </div>
        {mode === "cnr" ? (
          <CaseStatusLookup externalCnr={externalCnr} lookupToken={lookupToken} />
        ) : (
          <CaseSearch onSelectCnr={openCnr} />
        )}
      </div>
    </div>
  );
}

export default function CaseStatusPage() {
  return (
    <Suspense>
      <CaseStatusPageInner />
    </Suspense>
  );
}
