"use client";

import { useState } from "react";
import { CaseStatusLookup } from "@/components/case-status/case-status-lookup";
import { CaseSearch } from "@/components/case-status/case-search";

export default function CaseStatusPage() {
  const [externalCnr, setExternalCnr] = useState<string | undefined>();
  const [lookupToken, setLookupToken] = useState(0);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-navy-950">
          Case status
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Look up a case by CNR number, or search court records by party, case
          number and court.
        </p>
      </div>

      <div className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-navy-950">Search by CNR</h2>
        <CaseStatusLookup
          externalCnr={externalCnr}
          lookupToken={lookupToken}
        />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-navy-950">
          Search court records
        </h2>
        <p className="mb-2 text-xs text-ink-400">
          Find a case, then use its CNR in the search above for the full record.
        </p>
        <CaseSearch
          onSelectCnr={(cnr) => {
            setExternalCnr(cnr);
            setLookupToken((t) => t + 1);
          }}
        />
      </div>
    </div>
  );
}
