"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, FileText, RefreshCw, ShieldCheck } from "lucide-react";
import type { AnalysisResult, RiskLevel } from "@/lib/documents/types";
import { DocumentChat } from "./document-chat";

interface DocInfo {
  id: string;
  name: string;
  kind: string;
  mimeType: string | null;
  status: string;
  pageCount: number | null;
  createdAt: string;
}

type Tab = "overview" | "clauses" | "risks" | "missing" | "privacy" | "chat";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "clauses", label: "Clause Analysis" },
  { key: "risks", label: "Risk Analysis" },
  { key: "missing", label: "Missing Information" },
  { key: "privacy", label: "Privacy / PII" },
  { key: "chat", label: "Ask NyayAI" },
];

const SEVERITY_STYLES: Record<RiskLevel, string> = {
  LOW: "bg-verified-100 text-verified-700",
  MEDIUM: "bg-amber-100 text-amber-800",
  HIGH: "bg-critical-100 text-critical-600",
  CRITICAL: "bg-critical-600 text-white",
};

function SeverityBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${SEVERITY_STYLES[level] ?? SEVERITY_STYLES.LOW}`}>
      {level}
    </span>
  );
}

export function AnalysisDashboard({
  documentId,
  initialDoc,
}: {
  documentId: string;
  initialDoc: DocInfo;
}) {
  const [doc] = useState(initialDoc);
  const [status, setStatus] = useState<string>(initialDoc.status);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [showRedacted, setShowRedacted] = useState(false);
  const [redactedText, setRedactedText] = useState<string | null>(null);

  const loadAnalysis = useCallback(async () => {
    const res = await fetch(`/api/documents/${documentId}/analysis`, { cache: "no-store" });
    const data = await res.json();
    setStatus(data.status ?? "none");
    setProgress(data.progress ?? 0);
    setStage(data.stage ?? null);
    setAnalysisError(data.error ?? null);
    if (data.status === "done" && data.result) setResult(data.result as AnalysisResult);
    return data.status;
  }, [documentId]);

  useEffect(() => {
    let active = true;
    (async () => {
      const s = await loadAnalysis();
      if (!active || (s !== "queued" && s !== "running")) return;
      while (active) {
        await new Promise((r) => setTimeout(r, 2000));
        const next = await loadAnalysis();
        if (next !== "queued" && next !== "running") break;
      }
    })();
    return () => {
      active = false;
    };
  }, [loadAnalysis]);

  async function reanalyze() {
    setResult(null);
    setStatus("queued");
    setProgress(0);
    setAnalysisError(null);
    await fetch(`/api/documents/${documentId}/analyze`, { method: "POST" });
    loadAnalysis().then((s) => s);
  }

  async function toggleRedacted() {
    if (showRedacted) {
      setShowRedacted(false);
      return;
    }
    if (!redactedText) {
      const res = await fetch(`/api/documents/${documentId}/redact`, { method: "POST" });
      const data = await res.json();
      if (data.ok) setRedactedText(data.redactedText);
    }
    setShowRedacted(true);
  }

  function jumpToPage(page: number | null) {
    if (!page) return;
    document.getElementById(`doc-page-${page}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const running = status === "queued" || status === "running";

  return (
    <div className="workspace-page !max-w-[110rem]">
      <Link
        href={doc.kind === "other" ? "/app/documents" : "/app/documents"}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-navy-950"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to documents
      </Link>

      <header className="mt-6 flex flex-wrap items-end justify-between gap-4 border-b border-ink-200 pb-5">
        <div>
          <p className="eyebrow">Legal Document Analyzer</p>
          <h1 className="mt-2 font-serif-display text-3xl text-navy-950">{doc.name}</h1>
          <p className="mt-2 text-xs text-ink-500">
            {doc.mimeType ?? "Unknown type"} · added {format(new Date(doc.createdAt), "d MMM yyyy")}
          </p>
        </div>
        <button
          type="button"
          onClick={reanalyze}
          disabled={running}
          className="inline-flex items-center gap-1.5 rounded-md border border-ink-200 px-3 py-1.5 text-xs font-semibold text-navy-800 transition-colors hover:border-navy-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${running ? "animate-spin" : ""}`} /> Re-run analysis
        </button>
      </header>

      {running && (
        <div className="mt-6 rounded-lg border border-ink-200 bg-white p-6">
          <p className="flex items-center gap-2 text-sm font-semibold text-navy-950">
            <span className="h-2 w-2 animate-pulse rounded-full bg-navy-700" /> Analyzing document…
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-100">
            <div className="h-full bg-navy-700 transition-all duration-500" style={{ width: `${Math.max(8, progress)}%` }} />
          </div>
          <p className="mt-2 text-xs capitalize text-ink-500">Step: {stage ?? "starting"} · {Math.max(8, progress)}%</p>
        </div>
      )}

      {status === "failed" && (
        <div className="mt-6 rounded-lg border border-critical-200 bg-critical-100 p-5">
          <p className="text-sm font-semibold text-critical-600">Analysis failed</p>
          <p className="mt-1 text-xs text-critical-600">{analysisError ?? "An unexpected error occurred."} You can try re-running it.</p>
        </div>
      )}

      {!result && !running && status !== "failed" && (
        <div className="mt-10 border border-dashed border-ink-300 py-16 text-center">
          <FileText className="mx-auto h-6 w-6 text-ink-400" />
          <p className="mt-4 text-sm text-ink-600">This document has not been analyzed yet.</p>
          <button
            type="button"
            onClick={reanalyze}
            className="mt-4 inline-block rounded-md bg-navy-700 px-4 py-2 text-xs font-semibold text-white hover:bg-navy-800"
          >
            Run analysis
          </button>
        </div>
      )}

      {result && (
        <>
          {/* Summary cards */}
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Card label="Document Type" value={result.documentType.name} sub={`${Math.round(result.documentType.confidence * 100)}% confidence`} />
            <Card label="Pages" value={String(result.citations.length ? Math.max(...result.citations.map((c) => c.page ?? 0)) : doc.pageCount ?? 1)} />
            <Card label="PII Detected" value={String(result.pii.count)} sub={result.pii.engine === "presidio" ? "Presidio engine" : "regex engine"} />
            <Card label="Key Clauses" value={String(result.clauses.length)} />
            <Card
              label="Risks Found"
              value={String(result.risks.length)}
              accent={
                result.risks.some((r) => r.level === "CRITICAL")
                  ? "text-critical-600"
                  : result.risks.some((r) => r.level === "HIGH")
                    ? "text-critical-600"
                    : result.risks.some((r) => r.level === "MEDIUM")
                      ? "text-amber-700"
                      : undefined
              }
            />
          </div>

          {/* Tabs */}
          <div className="mt-7 flex flex-wrap gap-1 border-b border-ink-200">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`rounded-t px-4 py-2 text-sm font-semibold transition-colors ${
                  tab === t.key ? "border-b-2 border-navy-700 text-navy-950" : "text-ink-500 hover:text-navy-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
            <section className="min-w-0">
              {tab === "overview" && <OverviewTab result={result} onJump={jumpToPage} />}
              {tab === "clauses" && <ClausesTab result={result} onJump={jumpToPage} />}
              {tab === "risks" && <RisksTab result={result} onJump={jumpToPage} />}
              {tab === "missing" && <MissingTab result={result} />}
              {tab === "privacy" && <PrivacyTab result={result} onJump={jumpToPage} />}
              {tab === "chat" && (
                <DocumentChat documentId={documentId} documentName={doc.name} analysis={result} />
              )}
            </section>

            {/* Document text panel */}
            <aside className="xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:self-start">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="eyebrow text-navy-700">Document text</h2>
                {result.pii.count > 0 && (
                  <button
                    type="button"
                    onClick={toggleRedacted}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                      showRedacted ? "border-navy-700 bg-navy-700 text-white" : "border-ink-200 text-ink-600 hover:border-navy-700"
                    }`}
                  >
                    <ShieldCheck className="h-3 w-3" /> {showRedacted ? "Showing redacted" : "Show redacted"}
                  </button>
                )}
              </div>
              <DocumentTextViewer documentId={documentId} redactedOverride={showRedacted ? redactedText : null} />
            </aside>
          </div>

          <p className="mt-8 border-t border-ink-200 pt-4 text-xs leading-5 text-ink-500">{result.meta.disclaimer}</p>
        </>
      )}
    </div>
  );
}

function Card({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-ink-200 bg-white p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">{label}</p>
      <p className={`mt-1.5 truncate font-serif-display text-xl ${accent ?? "text-navy-950"}`}>{value}</p>
      {sub && <p className="mt-0.5 truncate text-[11px] text-ink-400">{sub}</p>}
    </div>
  );
}

/* ------------------------------ tabs ------------------------------------ */

function FactList({ facts, onJump }: { facts: { label: string; value: string; page: number | null }[]; onJump: (p: number | null) => void }) {
  if (facts.length === 0) return <p className="text-sm text-ink-400">None found in the document.</p>;
  return (
    <ul className="space-y-1.5">
      {facts.map((f, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-ink-700">
          <span className="min-w-0 flex-1">
            <span className="font-semibold text-navy-950">{f.label}:</span> {f.value}
          </span>
          <PageChip page={f.page} onJump={onJump} />
        </li>
      ))}
    </ul>
  );
}

function PageChip({ page, onJump }: { page: number | null; onJump: (p: number | null) => void }) {
  if (!page) return null;
  return (
    <button
      type="button"
      onClick={() => onJump(page)}
      className="shrink-0 rounded bg-navy-100 px-1.5 py-0.5 text-[10px] font-bold text-navy-800 hover:bg-navy-200"
    >
      p.{page}
    </button>
  );
}

function OverviewTab({ result, onJump }: { result: AnalysisResult; onJump: (p: number | null) => void }) {
  const o = result.overview;
  return (
    <div className="space-y-5">
      {result.summary && (
        <div className="rounded-lg border border-ink-200 bg-white p-5">
          <h3 className="eyebrow text-navy-700">Summary</h3>
          <p className="mt-2 text-sm leading-6 text-ink-700">{result.summary}</p>
        </div>
      )}
      <Panel title="Parties"><FactList facts={o.parties} onJump={onJump} /></Panel>
      <div className="grid gap-5 md:grid-cols-2">
        <Panel title="Important Dates"><FactList facts={o.importantDates} onJump={onJump} /></Panel>
        <Panel title="Monetary Amounts"><FactList facts={o.amounts} onJump={onJump} /></Panel>
        <Panel title="Deadlines"><FactList facts={o.deadlines} onJump={onJump} /></Panel>
        <Panel title="Duration & Jurisdiction">
          <ul className="space-y-1.5 text-sm text-ink-700">
            <li><span className="font-semibold text-navy-950">Duration:</span> {o.duration ?? "Not specified in the document."}</li>
            <li><span className="font-semibold text-navy-950">Jurisdiction:</span> {o.jurisdiction ?? "Not specified in the document."}</li>
          </ul>
        </Panel>
      </div>
      <Panel title="Key Obligations">
        {o.obligations.length ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink-700">
            {o.obligations.map((ob, i) => <li key={i}>{ob}</li>)}
          </ul>
        ) : (
          <p className="text-sm text-ink-400">None found in the document.</p>
        )}
      </Panel>
      <Panel title="Key Terms">
        {o.keyTerms.length ? (
          <div className="flex flex-wrap gap-1.5">
            {o.keyTerms.map((t, i) => (
              <span key={i} className="rounded-full bg-navy-100 px-2.5 py-1 text-xs text-navy-800">{t}</span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-400">None found in the document.</p>
        )}
      </Panel>
    </div>
  );
}

function ClausesTab({ result, onJump }: { result: AnalysisResult; onJump: (p: number | null) => void }) {
  if (result.clauses.length === 0) return <Empty text="No clauses could be identified in this document." />;
  return (
    <div className="space-y-3">
      {[...result.clauses]
        .sort((a, b) => rank(b.riskLevel) - rank(a.riskLevel))
        .map((c, i) => (
        <div key={i} className="rounded-lg border border-ink-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold text-navy-950">{c.title}</h3>
            <div className="flex shrink-0 items-center gap-2">
              {c.category && <span className="rounded bg-navy-100 px-1.5 py-0.5 text-[10px] font-semibold text-navy-800">{c.category}</span>}
              <SeverityBadge level={c.riskLevel} />
              <PageChip page={c.page} onJump={onJump} />
            </div>
          </div>
          <p className="mt-1.5 text-sm leading-6 text-ink-700">{c.summary}</p>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-semibold text-ink-500 hover:text-navy-800">View clause text</summary>
            <p className="mt-2 whitespace-pre-wrap rounded bg-ink-50 p-3 text-xs leading-5 text-ink-600">{c.text.slice(0, 1200)}</p>
          </details>
        </div>
      ))}
    </div>
  );
}

function RisksTab({ result, onJump }: { result: AnalysisResult; onJump: (p: number | null) => void }) {
  if (result.risks.length === 0)
    return <Empty text="No specific risk patterns were detected. This is informational only — consider consulting a qualified lawyer for important decisions." />;
  return (
    <div className="space-y-3">
      {[...result.risks].sort((a, b) => rank(b.level) - rank(a.level)).map((r, i) => (
        <div key={i} className="rounded-lg border border-ink-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold text-navy-950">Potential concern — {r.clauseTitle}</h3>
            <div className="flex shrink-0 items-center gap-2">
              <SeverityBadge level={r.level} />
              <PageChip page={r.page} onJump={onJump} />
            </div>
          </div>
          <dl className="mt-3 space-y-2 text-sm">
            <Row term="What it says" value={r.whatItSays} />
            <Row term="Why it may matter" value={r.whyItMatters} />
            <Row term="Who it appears to favor" value={r.favors} />
            <Row term="Potential consequence" value={r.consequence} />
            <Row term="Suggested question / action" value={r.suggestedAction} highlight />
          </dl>
          {r.clauseExcerpt && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-semibold text-ink-500 hover:text-navy-800">View clause excerpt</summary>
              <p className="mt-2 whitespace-pre-wrap rounded bg-ink-50 p-3 text-xs leading-5 text-ink-600">{r.clauseExcerpt}</p>
            </details>
          )}
        </div>
      ))}
      <p className="rounded-md bg-navy-100 px-3 py-2 text-xs leading-5 text-navy-800">
        These are informational observations, not legal conclusions. Consider consulting a qualified lawyer before acting.
      </p>
    </div>
  );
}

function MissingTab({ result }: { result: AnalysisResult }) {
  if (result.missingInformation.length === 0)
    return <Empty text="No notable gaps were detected against the expected structure for this document type." />;
  return (
    <div className="space-y-3">
      {result.missingInformation.map((m, i) => (
        <div key={i} className="rounded-lg border border-amber-300 bg-amber-100/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold text-amber-800">Missing from document — {m.item}</h3>
            <span className="shrink-0 rounded bg-amber-300/60 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
              {m.expectation === "may_be_legally_required" ? "MAY BE LEGALLY REQUIRED" : "COMMONLY EXPECTED"}
            </span>
          </div>
          <p className="mt-1.5 text-sm leading-6 text-ink-700">{m.whyItMatters}</p>
        </div>
      ))}
      <p className="rounded-md bg-navy-100 px-3 py-2 text-xs leading-5 text-navy-800">
        Items marked &quot;commonly expected&quot; reflect drafting quality, not legal requirements. Where an item may be legally required, verify with a qualified lawyer or official source for your state and situation.
      </p>
    </div>
  );
}

function PrivacyTab({ result, onJump }: { result: AnalysisResult; onJump: (p: number | null) => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-ink-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h3 className="eyebrow text-navy-700">PII Detection</h3>
          <span className="rounded-full bg-navy-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy-800">
            Engine: {result.pii.engine}
          </span>
        </div>
        <p className="mt-2 text-sm text-ink-600">
          {result.pii.count === 0
            ? "No personal identifiers were detected."
            : `${result.pii.count} potential personal identifier${result.pii.count > 1 ? "s" : ""} detected. AI analysis ran on a redacted copy so raw PII was never sent to the language model.`}
        </p>
      </div>
      {result.pii.items.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-ink-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-200 bg-ink-50">
              <tr className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-400">
                <th className="px-4 py-2">Entity</th>
                <th className="px-4 py-2">Detected text</th>
                <th className="px-4 py-2">Confidence</th>
                <th className="px-4 py-2">Page</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {result.pii.items.map((item, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 font-semibold text-navy-950">{item.entity}</td>
                  <td className="max-w-[14rem] truncate px-4 py-2 text-ink-700">{item.text}</td>
                  <td className="px-4 py-2 text-ink-600">{Math.round(item.confidence * 100)}%</td>
                  <td className="px-4 py-2"><PageChip page={item.page} onJump={onJump} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Row({ term, value, highlight }: { term: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-400">{term}</dt>
      <dd className={`mt-0.5 leading-6 ${highlight ? "font-medium text-navy-950" : "text-ink-700"}`}>{value}</dd>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-ink-200 bg-white p-5">
      <h3 className="eyebrow text-navy-700">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-ink-300 py-12 text-center text-sm text-ink-500">{text}</div>;
}

function rank(level: RiskLevel): number {
  return { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }[level] ?? 0;
}

/* --------------------------- text viewer -------------------------------- */

function DocumentTextViewer({
  documentId,
  redactedOverride,
}: {
  documentId: string;
  redactedOverride: string | null;
}) {
  const [pages, setPages] = useState<{ page: number; text: string }[] | null>(null);
  const [fallbackText, setFallbackText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/documents/${documentId}/text`);
      if (!res.ok) return;
      const data = await res.json();
      if (cancelled) return;
      setPages(data.pages ?? null);
      if (!data.pages?.length && data.text) setFallbackText(data.text);
    })();
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  const displayText = redactedOverride ?? (pages?.length ? null : fallbackText);

  if (redactedOverride !== null) {
    return (
      <div className="document-surface max-h-[70vh] overflow-y-auto p-5">
        <pre className="whitespace-pre-wrap font-sans text-xs leading-6 text-ink-700">{redactedOverride}</pre>
      </div>
    );
  }
  if (pages?.length) {
    return (
      <div className="document-surface max-h-[70vh] space-y-4 overflow-y-auto p-5">
        {pages.map((p) => (
          <div key={p.page} id={`doc-page-${p.page}`}>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">Page {p.page}</p>
            <pre className="whitespace-pre-wrap font-sans text-xs leading-6 text-ink-700">{p.text}</pre>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="document-surface max-h-[70vh] overflow-y-auto p-5">
      {displayText ? (
        <pre className="whitespace-pre-wrap font-sans text-xs leading-6 text-ink-700">{displayText}</pre>
      ) : (
        <p className="text-xs text-ink-400">Loading document text…</p>
      )}
    </div>
  );
}
