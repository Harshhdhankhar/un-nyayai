"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import type { MatterSearchResult, SearchGroup } from "@/lib/workbench/types";

export function MatterSearch({ matterId }: { matterId: string }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<MatterSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const run = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) {
        setResult(null);
        setError(false);
        return;
      }
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`/api/matters/${matterId}/search?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error();
        setResult(data.result);
      } catch {
        setError(true);
        setResult(null);
      } finally {
        setLoading(false);
      }
    },
    [matterId]
  );

  useEffect(() => {
    const t = setTimeout(() => run(query), 200);
    return () => clearTimeout(t);
  }, [query, run]);

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search this matter…"
        className="w-full rounded-md border border-ink-200 bg-white py-2 pl-9 pr-8 text-sm text-ink-900 placeholder:text-ink-400 focus:border-navy-400 focus:outline-none"
      />
      {query ? (
        <button onClick={() => { setQuery(""); setResult(null); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600" aria-label="Clear search">
          <X className="h-4 w-4" />
        </button>
      ) : null}

      {open && (loading || result || error) ? (
        <div className="absolute right-0 left-0 top-11 z-30 max-h-[70vh] overflow-auto rounded-lg border border-ink-200 bg-white shadow-xl">
          {error ? <p className="p-4 text-sm text-critical-600">Search failed. Try again.</p> : null}
          {loading && !result ? <p className="p-4 text-sm text-ink-500">Searching…</p> : null}
          {!loading && result && result.total === 0 ? <p className="p-4 text-sm text-ink-500">No matches for “{query}”.</p> : null}
          {result?.groups.map((group) => <SearchGroupRow key={group.group} group={group} matterId={matterId} onNavigate={() => setOpen(false)} />)}
          {result && result.total > 0 ? <p className="border-t border-ink-100 px-4 py-2 text-[10px] uppercase tracking-wide text-ink-400">{result.total} result{result.total === 1 ? "" : "s"} across this matter</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function SearchGroupRow({ group, matterId, onNavigate }: { group: SearchGroup; matterId: string; onNavigate: () => void }) {
  const hrefBase = `/app/matters/${matterId}`;
  return (
    <div className="border-b border-ink-100 last:border-b-0">
      <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">{group.group}</p>
      <ul>
        {group.items.map((item) => (
          <li key={item.id}>
            <Link href={item.href?.startsWith("/app") ? item.href : item.href ? `${hrefBase}${item.href}` : `${hrefBase}/overview`} onClick={onNavigate} className="flex items-start justify-between gap-3 px-4 py-2 hover:bg-ink-50">
              <span className="text-sm font-medium text-navy-950">{item.title}</span>
              {item.detail ? <span className="truncate pl-3 text-xs text-ink-400">{item.detail}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}