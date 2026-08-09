"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, FilePlus2, Landmark, Loader2, Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";

const starters = [
  "Someone didn't pay me",
  "I received a legal notice",
  "I have a court case",
  "I was scammed",
  "Workplace problem",
  "Property problem",
  "Family issue",
  "Consumer issue",
  "Need free legal help",
];

type Triage = {
  category: string;
  subCategory?: string;
  facts?: { fact: string }[];
};

export function LegalIntake() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [statement, setStatement] = useState("");
  const [cnrOpen, setCnrOpen] = useState(false);
  const [cnr, setCnr] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function continueToMatter() {
    if (statement.trim().length < 10) {
      setError("Please add a little more detail so we can understand the situation.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const triageResponse = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statement: statement.trim(), language: "en" }),
      });
      const triageJson = await triageResponse.json();
      const triage: Triage | undefined = triageJson.ok ? triageJson.triage : undefined;
      const cleanStatement = statement.trim();
      const firstLine = cleanStatement.split(/[.!?\n]/)[0]?.trim() || "Legal matter";
      const title = firstLine.length > 72 ? `${firstLine.slice(0, 69)}…` : firstLine;

      const response = await fetch("/api/matters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: cleanStatement,
          matterType: triage?.category ?? "other",
          subCategory: triage?.subCategory,
          cnr: cnr.trim() || undefined,
          facts: triage?.facts?.map((item) => ({ fact: item.fact })) ?? [],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not create the matter.");

      if (files.length) {
        const form = new FormData();
        files.forEach((file) => form.append("files", file));
        const upload = await fetch(`/api/matters/${data.matter.id}/documents`, { method: "POST", body: form });
        if (!upload.ok) {
          router.push(`/app/matters/${data.matter.id}/documents?upload=retry`);
          router.refresh();
          return;
        }
      }
      router.push(`/app/matters/${data.matter.id}/overview`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not continue. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="document-surface relative overflow-hidden border-t-2 border-t-navy-950">
        <div className="grid min-h-[21rem] lg:grid-cols-[1fr_auto]">
          <div className="p-5 sm:p-8 lg:p-10">
            <label htmlFor="legal-situation" className="sr-only">Describe what happened</label>
            <textarea
              id="legal-situation"
              value={statement}
              onChange={(event) => setStatement(event.target.value)}
              placeholder="Start with the facts, dates, people involved, and what you want to resolve…"
              className="min-h-44 w-full resize-none bg-transparent font-serif-display text-[clamp(1.25rem,2.5vw,1.75rem)] leading-[1.55] text-navy-950 placeholder:text-ink-300 focus:outline-none"
              maxLength={4000}
              autoFocus
            />
            {cnrOpen ? (
              <div className="mt-3 flex max-w-md items-center gap-2 border-b border-ink-300 pb-2">
                <Landmark className="h-4 w-4 shrink-0 text-ink-500" />
                <label htmlFor="intake-cnr" className="sr-only">CNR number</label>
                <input id="intake-cnr" value={cnr} onChange={(event) => setCnr(event.target.value.toUpperCase())} placeholder="Enter 16-character CNR" className="min-w-0 flex-1 bg-transparent text-sm tracking-wide outline-none placeholder:tracking-normal" />
                <button type="button" onClick={() => { setCnrOpen(false); setCnr(""); }} aria-label="Remove CNR" className="p-1 text-ink-400 hover:text-ink-800"><X className="h-4 w-4" /></button>
              </div>
            ) : null}
            {files.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {files.map((file, index) => (
                  <span key={`${file.name}-${index}`} className="inline-flex items-center gap-2 border border-ink-200 bg-paper-warm px-2.5 py-1.5 text-xs text-ink-700">
                    <Paperclip className="h-3.5 w-3.5" />
                    <span className="max-w-52 truncate">{file.name}</span>
                    <button type="button" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${file.name}`}><X className="h-3.5 w-3.5" /></button>
                  </span>
                ))}
              </div>
            ) : null}
            {error ? <p role="alert" className="mt-4 text-sm text-critical-600">{error}</p> : null}
          </div>

          <div className="flex items-end justify-between gap-3 border-t border-ink-200 bg-paper-warm/60 p-4 sm:px-8 lg:w-48 lg:flex-col lg:items-stretch lg:justify-end lg:border-l lg:border-t-0 lg:p-5">
            <div className="flex gap-1 lg:flex-col">
              <input ref={fileRef} type="file" multiple accept=".pdf,.txt,.doc,.docx,image/*" className="sr-only" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} />
              <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex min-h-10 items-center gap-2 px-2 text-xs font-semibold text-ink-600 hover:text-navy-950">
                <FilePlus2 className="h-4 w-4" /> <span className="hidden sm:inline">Attach document</span>
              </button>
              <button type="button" onClick={() => setCnrOpen(true)} className={cn("inline-flex min-h-10 items-center gap-2 px-2 text-xs font-semibold hover:text-navy-950", cnrOpen ? "text-navy-950" : "text-ink-600")}>
                <Landmark className="h-4 w-4" /> <span className="hidden sm:inline">Add case / CNR</span>
              </button>
            </div>
            <button type="button" onClick={continueToMatter} disabled={busy || statement.trim().length < 10} className="inline-flex min-h-12 items-center justify-center gap-2 bg-navy-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-40">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-x-1.5 gap-y-2" aria-label="Common situations">
        {starters.map((starter) => (
          <button key={starter} type="button" onClick={() => setStatement(starter)} className="border border-ink-200 bg-white px-3 py-2 text-xs text-ink-600 transition-colors hover:border-navy-700 hover:text-navy-950">
            {starter}
          </button>
        ))}
      </div>
    </div>
  );
}
