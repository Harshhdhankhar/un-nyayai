"use client";

import { useState } from "react";
import { Search, FileSearch, MessageCircleQuestion, Loader2, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Panel } from "./panel";
import { SourceRefs } from "./source-refs";
import type {
  AskResult,
  CrossExamResult,
  MatterSearchResult,
} from "@/lib/workbench/types";

export function WorkbenchClient({ matterId }: { matterId: string }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <SearchPanel matterId={matterId} />
      <CrossExamPanel matterId={matterId} />
      <div className="lg:col-span-2">
        <AskPanel matterId={matterId} />
      </div>
    </div>
  );
}

/* ------------------------------ case file search ------------------------ */

function SearchPanel({ matterId }: { matterId: string }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<MatterSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    const query = q.trim();
    if (!query || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/matters/${matterId}/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "Search failed.");
      setResult(data.result);
    } catch {
      setError("Search failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      eyebrow="Case file search"
      title="Search this matter"
      description="Search across facts, documents, evidence, court record, research, timeline, drafts and notes."
    >
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. security deposit" aria-label="Search this matter" />
        <Button type="submit" loading={busy} className="shrink-0">
          {!busy && <Search className="h-4 w-4" />}
          Search
        </Button>
      </form>
      {error ? <p className="mt-3 text-sm text-critical-600">{error}</p> : null}
      {result ? (
        result.groups.length ? (
          <div className="mt-5 space-y-4">
            {result.groups.map((g) => (
              <div key={g.group}>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">{g.group}</p>
                <ul className="mt-2 space-y-1.5">
                  {g.items.map((it) => (
                    <li key={`${g.group}-${it.id}`} className="rounded-md border border-ink-100 px-3 py-2">
                      <p className="text-sm text-navy-950">{it.title}</p>
                      {it.detail ? <p className="text-xs text-ink-500">{it.detail}</p> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink-500">No matches found.</p>
        )
      ) : null}
    </Panel>
  );
}

/* --------------------------- document cross-exam ------------------------ */

function CrossExamPanel({ matterId }: { matterId: string }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CrossExamResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    const question = q.trim();
    if (!question || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/matters/${matterId}/cross-exam`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "Search failed.");
      setResult(data.result);
    } catch {
      setError("Search failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      eyebrow="Document cross-examination"
      title="Ask across all documents"
      description="Questions are answered from your document text, never from memory — each match links to its document."
    >
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Where is the deposit mentioned?" aria-label="Cross-examine documents" />
        <Button type="submit" loading={busy} className="shrink-0">
          {!busy && <FileSearch className="h-4 w-4" />}
          Ask
        </Button>
      </form>
      {error ? <p className="mt-3 text-sm text-critical-600">{error}</p> : null}
      {result ? (
        <div className="mt-5 space-y-4">
          <p className="text-sm font-medium text-navy-950">{result.answer}</p>
          {result.matches.length ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">Matches</p>
              <ul className="mt-2 space-y-2">
                {result.matches.map((m, i) => (
                  <li key={i} className="rounded-md border border-ink-100 px-3 py-2">
                    <p className="text-xs font-semibold text-navy-800">
                      {m.documentName}
                      {m.page ? ` · Page ${m.page}` : ""}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-ink-600">{m.passage}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {result.conflicts.length ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-critical-600">Conflicts</p>
              <ul className="mt-2 space-y-2">
                {result.conflicts.map((m, i) => (
                  <li key={i} className="rounded-md border border-critical-200 bg-critical-50 px-3 py-2">
                    <p className="text-xs font-semibold text-critical-700">{m.documentName}</p>
                    <p className="mt-1 text-xs text-critical-700">{m.passage}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </Panel>
  );
}

/* ------------------------------ ask this matter ------------------------- */

const PRESETS = [
  "What are the biggest gaps?",
  "What changed since the last hearing?",
  "Which facts have only one source?",
  "Show contradictions.",
  "What evidence supports payment?",
  "What directions from the court remain pending?",
  "Give me the chronology.",
];

function AskPanel({ matterId }: { matterId: string }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/matters/${matterId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const data = await res.json();
      if (res.ok) setResult(data.result);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      eyebrow="Ask this matter"
      title="Ask the matter, not the world"
      description="Answers come from this Matter's own data and sources — grounded, not general knowledge."
    >
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
      >
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about this matter…" aria-label="Ask this matter" />
        <Button type="submit" loading={busy} className="shrink-0">
          {!busy && <Send className="h-4 w-4" />}
          Ask
        </Button>
      </form>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => ask(p)}
            className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-ink-50/50 px-2.5 py-1 text-[11px] text-ink-600 transition-colors hover:border-navy-700 hover:text-navy-800"
          >
            <MessageCircleQuestion className="h-3 w-3" />
            {p}
          </button>
        ))}
      </div>
      {busy ? (
        <p className="mt-4 inline-flex items-center gap-2 text-sm text-ink-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Reading this matter…
        </p>
      ) : null}
      {result ? (
        <div className="mt-4 rounded-lg border border-ink-200 bg-ink-50/40 p-4">
          <p className="text-sm leading-6 text-navy-950">{result.answer}</p>
          <SourceRefs sources={result.sources} />
        </div>
      ) : null}
    </Panel>
  );
}
