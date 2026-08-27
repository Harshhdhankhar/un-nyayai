"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

export interface CaseSearchRow {
  cnr: string;
  caseType: string;
  caseStatus: string;
  courtName: string;
  filingDate: string;
  registrationNumber: string;
  nextHearingDate: string | null;
  decisionDate: string | null;
  petitioners: string[];
  respondents: string[];
  judges: string[];
}

export function CaseSearch({
  onSelectCnr,
}: {
  onSelectCnr?: (cnr: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [court, setCourt] = useState("");
  const [year, setYear] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<CaseSearchRow[]>([]);
  const [totalHits, setTotalHits] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [mode, setMode] = useState<"live" | "demo">("live");
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function runSearch(p: number) {
    if (!query.trim() || searching) return;
    setSearching(true);
    setError(null);
    setSearched(true);
    const params = new URLSearchParams({ query: query.trim(), page: String(p) });
    if (court.trim()) params.set("court", court.trim());
    if (year.trim()) params.set("year", year.trim());
    try {
      const res = await fetch(`/api/case-search?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Search failed.");
        return;
      }
      setResults(data.results);
      setTotalHits(data.totalHits);
      setPage(data.page);
      setHasNextPage(data.hasNextPage);
      setMode(data.mode);
    } catch {
      setError("Search failed.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-4">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(1);
        }}
      >
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Party name, case number or case number/year (e.g. 138/2024)"
            aria-label="Search cases"
          />
          <Button type="submit" loading={searching} className="shrink-0">
            {!searching && <Search className="h-4 w-4" />}
            Search
          </Button>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label htmlFor="court" className="text-xs text-ink-500">
              Court code (e.g. DLHC01)
            </Label>
            <Input
              id="court"
              value={court}
              onChange={(e) => setCourt(e.target.value)}
              placeholder="DLHC01"
              className="w-40"
            />
          </div>
          <div>
            <Label htmlFor="year" className="text-xs text-ink-500">
              Filing year
            </Label>
            <Input
              id="year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2024"
              className="w-32"
            />
          </div>
        </div>
      </form>

      {error && <p className="text-sm text-critical-600">{error}</p>}

      {mode === "demo" && results.length > 0 && (
        <p className="rounded-md bg-amber-100 px-3 py-2 text-xs text-amber-700">
          Live case search unavailable — showing demo data. Verify before relying.
        </p>
      )}

      {results.length > 0 && (
        <>
          <p className="text-xs text-ink-400">
            {totalHits.toLocaleString("en-IN")} matches
          </p>
          <div className="space-y-3">
            {results.map((r) => (
              <button
                key={r.cnr}
                type="button"
                onClick={() => onSelectCnr?.(r.cnr)}
                className="block w-full rounded-md border border-ink-200 bg-white p-4 text-left transition-colors hover:border-navy-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900">
                      {r.petitioners[0] ?? "—"} vs {r.respondents[0] ?? "—"}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {r.caseType} · {r.courtName}
                      {r.filingDate ? ` · filed ${r.filingDate}` : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      CNR {r.cnr}
                      {r.nextHearingDate ? ` · next hearing ${r.nextHearingDate}` : ""}
                    </p>
                  </div>
                  <Badge tone={r.caseStatus === "DISPOSED" ? "navy" : "amber"}>
                    {r.caseStatus}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => runSearch(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <span className="text-xs text-ink-400">Page {page}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNextPage}
              onClick={() => runSearch(page + 1)}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {searched && !searching && !error && results.length === 0 ? (
        <div className="rounded-md border border-dashed border-ink-300 p-8 text-center">
          <p className="text-sm font-semibold text-navy-950">No cases found</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">
            Nothing matched. Try a different spelling, add a year, or use the
            court code (e.g. DLHC01) to narrow the search.
          </p>
        </div>
      ) : results.length === 0 && !searching ? (
        <p className="text-sm text-ink-400">
          Search court records by party name, case number or year. Use the court
          code (e.g. DLHC01) to narrow results to a specific court.
        </p>
      ) : null}
    </div>
  );
}
