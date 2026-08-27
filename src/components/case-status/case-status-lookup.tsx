"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [cnr, setCnr] = useState("");
  const [looking, setLooking] = useState(false);
  const [result, setResult] = useState<CaseLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
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

  async function importAsMatter() {
    if (!result) return;
    setImporting(true);
    setError(null);
    const record = result.caseData.record;
    try {
      const response = await fetch("/api/matters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${record.petitioner} v. ${record.respondent}`,
          description: result.summary.humanSummary,
          matterType: "other",
          court: record.courtName,
          cnr: record.cnr,
          facts: [
            { fact: `Case status: ${record.caseStatus}`, kind: "extracted" },
            { fact: `Current stage: ${record.stage}`, kind: "extracted" },
          ],
          parties: [
            { name: record.petitioner, role: "petitioner" },
            { name: record.respondent, role: "respondent" },
          ],
          events: result.caseData.history.map((item) => ({
            eventDate: item.hearingDate || undefined,
            title: item.purpose || "Court hearing",
            description: [item.result, item.orderSummary].filter(Boolean).join(" — ") || undefined,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not import this case.");
      router.push(`/app/matters/${data.matter.id}/case`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not import this case.");
    } finally {
      setImporting(false);
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
            <Button type="button" size="sm" variant="outline" loading={importing} onClick={importAsMatter} className="ml-auto">
              Import as Matter
            </Button>
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
