"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, BookmarkPlus } from "lucide-react";

export interface ResearchHit {
  id: string | number;
  title: string;
  type: string;
  authority?: string;
  date?: string;
  citation?: string;
  excerpt?: string;
  url?: string;
  mode: "live" | "mock";
  relevance?: number;
}

export interface ResearchIntent {
  humanQuery: string;
  legalConcepts: string[];
  provisions: string[];
}

export function ResearchSearch({ matterId }: { matterId: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [hits, setHits] = useState<ResearchHit[]>([]);
  const [intent, setIntent] = useState<ResearchIntent | null>(null);
  const [mode, setMode] = useState<"live" | "mock">("live");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function search() {
    const query = q.trim();
    if (!query || searching) return;
    setSearching(true);
    setError(null);
    setWarning(null);
    try {
      const res = await fetch(
        `/api/matters/${matterId}/research?q=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Search failed.");
        return;
      }
      if (data.failure) {
        setWarning(
          data.failure.kind === "TIMEOUT"
            ? "Legal research could not be refreshed right now. No fabricated results are shown — check back in a moment."
            : data.failure.kind === "RATE_LIMITED"
              ? "Legal research is rate-limited right now. Please wait and search again."
              : "Legal research could not be refreshed right now. No fabricated results are shown."
        );
        setHits([]);
        setIntent(null);
        setMode(data.mode);
        return;
      }
      setHits(
      ((data.results ?? []) as unknown[]).map((r) => {
        const ranked = (data.ranked ?? []).find(
          (x: { tid: number }) => x.tid === (r as { tid: number }).tid
        );
        return ranked
          ? {
              ...(r as ResearchHit),
              id: (r as { tid: number }).tid,
              relevance: ranked.relevance as number,
            }
          : { ...(r as ResearchHit), id: (r as { tid: number }).tid };
      })
    );
      setIntent(data.intent ?? null);
      setMode(data.mode);
    } catch {
      setError("Search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function save(hit: ResearchHit) {
    setSavingId(String(hit.id));
    try {
      await fetch(`/api/matters/${matterId}/sources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: hit.title,
          type: hit.type,
          authority: hit.authority,
          citation: hit.citation,
          url: hit.url,
          excerpt: hit.excerpt,
          // Live provider hits are genuine retrieved sources; demo/mock data
          // is not — flag it so it is never saved as if it were verified.
          status: hit.mode === "live" ? "verified" : "needs_verification",
        }),
      });
      router.refresh();
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Indian Kanoon (judgments, sections)…"
          aria-label="Search case law"
        />
        <Button type="submit" loading={searching} className="shrink-0">
          {!searching && <Search className="h-4 w-4" />}
          Search
        </Button>
      </form>

      {error && <p className="text-sm text-critical-600">{error}</p>}

      {warning && <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">{warning}</p>}

      {mode === "mock" && hits.length > 0 && (
        <p className="rounded-md bg-amber-100 px-3 py-2 text-xs text-amber-700">
          Live case-law API unavailable — showing mock results. Verify before
          relying on them.
        </p>
      )}

      {intent && intent.humanQuery && (
        <p className="rounded-md bg-navy-50 px-3 py-2 text-xs text-navy-800">
          <span className="font-medium">Searched:</span> {intent.humanQuery}
          {intent.provisions.length > 0 && (
            <> (citing {intent.provisions.join(", ")})</>
          )}
        </p>
      )}

      {hits.length > 0 && (
        <div className="space-y-3">
          {hits.map((h) => (
            <div key={h.id} className="rounded-md border border-ink-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-ink-900">{h.title}</p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {[h.authority, h.date, h.citation].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {typeof h.relevance === "number" && (
                    <span
                      className="rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-600"
                      title="How well this result matches your query — a relevance-to-query measure, not a prediction of legal strength."
                    >
                      {h.relevance}% relevant
                    </span>
                  )}
                  <button
                  type="button"
                  onClick={() => save(h)}
                  disabled={savingId === h.id}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-ink-200 px-2 py-1 text-xs text-ink-600 transition-colors hover:border-navy-700 hover:text-navy-800 disabled:opacity-50"
                >
                  {savingId === h.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <BookmarkPlus className="h-3 w-3" />
                  )}
                  Save
                </button>
                </div>
              </div>
              {h.excerpt && (
                <p className="mt-2 line-clamp-3 text-xs text-ink-500">{h.excerpt}</p>
              )}
              {h.url && (
                <a
                  href={h.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-xs text-navy-700 underline"
                >
                  View on Indian Kanoon
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
