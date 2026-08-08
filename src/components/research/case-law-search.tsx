"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

export interface ResearchHit {
  id: string;
  title: string;
  type: string;
  authority?: string;
  date?: string;
  citation?: string;
  excerpt?: string;
  url?: string;
  numCites?: number;
  numCitedBy?: number;
  mode: "live" | "mock";
}

interface DocView {
  title: string;
  date: string;
  caseNo: string;
  doctype: string;
  fullText: string;
  source: string;
  numCites: number;
  numCitedBy: number;
}

export function CaseLawSearch() {
  const [q, setQ] = useState("");
  const [fromdate, setFromdate] = useState("");
  const [todate, setTodate] = useState("");
  const [sortby, setSortby] = useState<"relevance" | "date">("relevance");
  const [page, setPage] = useState(0);
  const [searching, setSearching] = useState(false);
  const [hits, setHits] = useState<ResearchHit[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [mode, setMode] = useState<"live" | "mock">("live");
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<DocView | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);

  function buildUrl(p: number) {
    const params = new URLSearchParams({ q: q.trim() });
    if (fromdate) params.set("fromdate", fromdate);
    if (todate) params.set("todate", todate);
    if (sortby === "date") params.set("sortby", "date");
    params.set("page", String(p));
    return `/api/research?${params.toString()}`;
  }

  async function runSearch(p: number) {
    if (!q.trim() || searching) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(buildUrl(p));
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Search failed.");
        return;
      }
      setHits(data.results);
      setMode(data.mode);
      setPage(data.page);
      setHasMore(data.hasMore);
    } catch {
      setError("Search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function openDoc(hit: ResearchHit) {
    const tid = hit.id.replace("ik-", "");
    if (!/^\d+$/.test(tid)) return;
    setLoadingDoc(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/research/doc/${tid}?query=${encodeURIComponent(q.trim())}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not load document.");
        return;
      }
      setViewing(data.doc);
    } catch {
      setError("Could not load document.");
    } finally {
      setLoadingDoc(false);
    }
  }

  return (
    <div className="space-y-4">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(0);
        }}
      >
        <div className="flex gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search case law, statutes, citations…"
            aria-label="Search case law"
          />
          <Button type="submit" loading={searching} className="shrink-0">
            {!searching && <Search className="h-4 w-4" />}
            Search
          </Button>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label htmlFor="fromdate" className="text-xs text-ink-500">
              From
            </Label>
            <Input
              id="fromdate"
              type="date"
              value={fromdate}
              onChange={(e) => setFromdate(e.target.value)}
              className="w-40"
            />
          </div>
          <div>
            <Label htmlFor="todate" className="text-xs text-ink-500">
              To
            </Label>
            <Input
              id="todate"
              type="date"
              value={todate}
              onChange={(e) => setTodate(e.target.value)}
              className="w-40"
            />
          </div>
          <div>
            <Label htmlFor="sortby" className="text-xs text-ink-500">
              Sort
            </Label>
            <select
              id="sortby"
              value={sortby}
              onChange={(e) =>
                setSortby(e.target.value as "relevance" | "date")
              }
              className="h-9 rounded-md border border-ink-200 bg-white px-2 text-sm"
            >
              <option value="relevance">Relevance</option>
              <option value="date">Newest first</option>
            </select>
          </div>
        </div>
      </form>

      {error && <p className="text-sm text-critical-600">{error}</p>}

      {mode === "mock" && hits.length > 0 && (
        <p className="rounded-md bg-amber-100 px-3 py-2 text-xs text-amber-700">
          Live case-law API unavailable — showing mock results. Verify before
          relying on them.
        </p>
      )}

      {hits.length > 0 && (
        <div className="space-y-3">
          {hits.map((h) => (
            <div key={h.id} className="rounded-md border border-ink-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-900">{h.title}</p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {[h.type, h.authority, h.date, h.citation]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {(h.numCites !== undefined || h.numCitedBy !== undefined) && (
                    <p className="mt-0.5 text-xs text-ink-400">
                      Cited {h.numCites ?? 0} times · cited by {h.numCitedBy ?? 0}
                    </p>
                  )}
                </div>
                {h.mode === "mock" && (
                  <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                    mock
                  </span>
                )}
              </div>
              {h.excerpt && (
                <p className="mt-2 line-clamp-3 text-xs text-ink-500">{h.excerpt}</p>
              )}
              <div className="mt-2 flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openDoc(h)}
                  loading={loadingDoc}
                >
                  Read judgment
                </Button>
                {h.url && (
                  <a
                    href={h.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-navy-700 underline"
                  >
                    Indian Kanoon <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {hits.length > 0 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => runSearch(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-xs text-ink-400">Page {page + 1}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasMore}
            onClick={() => runSearch(page + 1)}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {hits.length === 0 && !searching && (
        <p className="text-sm text-ink-400">
          Search judgments and statutes. Results come from Indian Kanoon when
          configured, with a labelled mock fallback otherwise.
        </p>
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4">
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-5 py-4">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-navy-950">
                  {viewing.title}
                </h3>
                <p className="mt-0.5 text-xs text-ink-500">
                  {[viewing.source, viewing.doctype, viewing.date, viewing.caseNo]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <button
                onClick={() => setViewing(null)}
                className="shrink-0 rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                aria-label="Close document viewer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <p className="mb-3 text-xs text-ink-400">
                Cited {viewing.numCites} times · cited by {viewing.numCitedBy}
              </p>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink-800">
                {viewing.fullText || "No text available."}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
