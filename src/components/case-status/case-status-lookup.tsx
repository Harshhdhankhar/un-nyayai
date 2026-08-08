"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export interface CaseTimelineItem {
  date: string;
  title: string;
  description: string;
}

export interface CaseLookupResult {
  caseData: {
    record: {
      caseType: string;
      caseNumber: string;
      caseStatus: string;
      petitioner: string;
      respondent: string;
      courtName: string;
      filingDate: string;
      nextHearingDate: string | null;
      stage: string;
      cnr: string;
    };
    history: { hearingDate: string; purpose?: string; result: string; orderSummary?: string }[];
    isDemo: boolean;
  };
  summary: {
    humanSummary: string;
    timeline: CaseTimelineItem[];
    currentStageExplanation: string;
    upcomingHearing: { date: string | null; note: string };
    whatHappenedLast: string;
    whatToPrepare: string[];
  };
  mode: "live" | "demo";
}

export function CaseStatusLookup({
  onLookup,
  externalCnr,
  lookupToken,
}: {
  onLookup?: (result: CaseLookupResult) => void;
  externalCnr?: string;
  lookupToken?: number;
}) {
  const [cnr, setCnr] = useState("");
  const [looking, setLooking] = useState(false);
  const [result, setResult] = useState<CaseLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastToken = useRef(0);

  async function lookup(value?: string) {
    const target = (value ?? cnr).trim();
    if (!target || looking) return;
    setLooking(true);
    setError(null);
    try {
      const res = await fetch(`/api/case-status?cnr=${encodeURIComponent(target)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not look up the case.");
        return;
      }
      setResult(data);
      onLookup?.(data);
    } catch {
      setError("Network error while looking up the case.");
    } finally {
      setLooking(false);
    }
  }

  useEffect(() => {
    if (lookupToken !== undefined && lookupToken !== lastToken.current) {
      lastToken.current = lookupToken;
      if (externalCnr) {
        const id = window.setTimeout(() => {
          void lookup(externalCnr);
        }, 0);
        return () => window.clearTimeout(id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookupToken]);

  return (
    <div className="space-y-5">
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          lookup();
        }}
      >
        <Input
          id="cnr-input"
          value={cnr}
          onChange={(e) => setCnr(e.target.value)}
          placeholder="CNR number, e.g. DLND020000012024"
          aria-label="CNR number"
          className="sm:flex-1"
        />
        <Button type="submit" loading={looking} className="shrink-0">
          {!looking && <Search className="h-4 w-4" />}
          Check status
        </Button>
      </form>

      {error && <p className="text-sm text-critical-600">{error}</p>}

      {result && (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            {result.mode === "demo" && (
              <Badge tone="amber">DEMO DATA — not a real case record</Badge>
            )}
            <Badge tone={result.caseData.record.caseStatus.toLowerCase().includes("pending") ? "amber" : "navy"}>
              {result.caseData.record.caseStatus}
            </Badge>
          </div>

          <div className="rounded-md border border-ink-200 bg-white p-4">
            <p className="text-sm font-medium text-navy-950">
              {result.caseData.record.petitioner} vs {result.caseData.record.respondent}
            </p>
            <p className="mt-1 text-sm text-ink-600">{result.summary.humanSummary}</p>
            <p className="mt-1 text-xs text-ink-400">
              {result.caseData.record.caseType} · {result.caseData.record.caseNumber} · {result.caseData.record.courtName} · filed {result.caseData.record.filingDate}
            </p>
          </div>

          <div className="rounded-md border border-navy-100 bg-navy-100/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-navy-800">
              Next hearing
            </p>
            <p className="mt-1 text-sm font-medium text-navy-950">
              {result.summary.upcomingHearing.date
                ? format(new Date(result.summary.upcomingHearing.date), "d MMM yyyy")
                : "Not scheduled"}
            </p>
            <p className="mt-0.5 text-xs text-ink-500">{result.summary.upcomingHearing.note}</p>
          </div>

          <div className="rounded-md border border-ink-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
              Stage
            </p>
            <p className="mt-1 text-sm text-ink-700">{result.summary.currentStageExplanation}</p>
          </div>

          <div className="rounded-md border border-ink-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
              What happened last
            </p>
            <p className="mt-1 text-sm text-ink-700">{result.summary.whatHappenedLast}</p>
          </div>

          <div className="rounded-md border border-ink-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
              Prepare
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-700">
              {result.summary.whatToPrepare.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
