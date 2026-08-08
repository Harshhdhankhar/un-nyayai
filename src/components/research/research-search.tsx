"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, BookmarkPlus } from "lucide-react";

export interface ResearchHit {
  id: string;
  title: string;
  type: string;
  authority?: string;
  date?: string;
  citation?: string;
  excerpt?: string;
  url?: string;
  mode: "live" | "mock";
}

export function ResearchSearch({ matterId }: { matterId: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [hits, setHits] = useState<ResearchHit[]>([]);
  const [mode, setMode] = useState<"live" | "mock">("live");
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function search() {
    const query = q.trim();
    if (!query || searching) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/matters/${matterId}/research?q=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Search failed.");
        return;
      }
      setHits(data.results);
      setMode(data.mode);
    } catch {
      setError("Search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function save(hit: ResearchHit) {
    setSavingId(hit.id);
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
          status: hit.mode === "live" ? "needs_verification" : "needs_verification",
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
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-ink-900">{h.title}</p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {[h.authority, h.date, h.citation].filter(Boolean).join(" · ")}
                  </p>
                </div>
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
