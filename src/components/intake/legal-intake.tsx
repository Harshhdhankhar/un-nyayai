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
  facts?: { fact: string; kind?: "statement" | "extracted" | "missing" }[];
  parties?: { name: string; role: string }[];
  dates?: { label: string; date?: string }[];
  amounts?: { label: string; amount?: number; currency?: string }[];
  location?: string;
  missingFacts?: string[];
  followUpQuestions?: string[];
};

type FollowUp = { question: string; answer: string };

export function LegalIntake() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [statement, setStatement] = useState("");
  const [cnrOpen, setCnrOpen] = useState(false);
  const [cnr, setCnr] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triage, setTriage] = useState<Triage | null>(null);
  const [followUp, setFollowUp] = useState<FollowUp[]>([]);

  const showFollowUp = followUp.length > 0 && triage !== null;

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
      if (!triageJson.ok) throw new Error("We couldn't analyse the situation. Please try again.");
      const triageData: Triage = triageJson.triage;

      const questions = (triageData.followUpQuestions ?? [])
        .map((q) => q.trim())
        .filter(Boolean)
        .slice(0, 4);

      if (questions.length > 0) {
        // Step 1: triage done — ask a few refining questions before creating.
        setTriage(triageData);
        setFollowUp(questions.map((question) => ({ question, answer: "" })));
        setBusy(false);
        return;
      }
      await createMatter(triageData);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not continue. Please try again.");
      setBusy(false);
    }
  }

  async function createMatter(triageData: Triage) {
    const cleanStatement = statement.trim();
    const firstLine = cleanStatement.split(/[.!?\n]/)[0]?.trim() || "Legal matter";
    const title = firstLine.length > 72 ? `${firstLine.slice(0, 69)}…` : firstLine;
    const extractedFacts = triageData.facts
      ?.filter((item) => item.kind !== "missing")
      .map((item) => ({ fact: item.fact, kind: item.kind ?? ("extracted" as const) })) ?? [];
    const amountFacts = triageData.amounts
      ?.filter((item) => typeof item.amount === "number")
      .map((item) => ({ fact: `${item.label}: ${item.currency ?? "INR"} ${item.amount}`, kind: "extracted" as const })) ?? [];
    const answerFacts = followUp
      .filter((item) => item.answer.trim().length > 0)
      .map((item) => ({
        fact: `${item.question.replace(/[?.!]\s*$/, "")}: ${item.answer.trim()}`,
        kind: "statement" as const,
      }));
    const missingFacts = triageData.missingFacts?.map((fact) => ({ fact, kind: "missing" as const })) ?? [];
    const events = triageData.dates
      ?.filter((item) => item.label.trim())
      .map((item) => ({ eventDate: item.date, title: item.label })) ?? [];

    const response = await fetch("/api/matters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: cleanStatement,
        matterType: triageData.category ?? "other",
        subCategory: triageData.subCategory,
        jurisdiction: triageData.location || undefined,
        cnr: cnr.trim() || undefined,
        facts: [...extractedFacts, ...amountFacts, ...answerFacts, ...missingFacts],
        parties: triageData.parties ?? [],
        events,
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
  }

  function updateAnswer(index: number, value: string) {
    setFollowUp((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, answer: value } : item)));
  }

  async function submitWithAnswers() {
    if (!triage) return;
    setBusy(true);
    setError(null);
    try {
      await createMatter(triage);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not continue. Please try again.");
      setBusy(false);
    }
  }

  async function skipFollowUp() {
    if (!triage) return;
    setBusy(true);
    setError(null);
    try {
      await createMatter(triage);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not continue. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="document-surface relative overflow-hidden">
        <div className="grid min-h-[18rem] lg:grid-cols-[1fr_auto]">
          <div className="p-5 sm:p-6">
            <label htmlFor="legal-situation" className="sr-only">Describe what happened</label>
            <textarea
              id="legal-situation"
              value={statement}
              onChange={(event) => setStatement(event.target.value)}
              placeholder="Start with the facts, dates, people involved, and what you want to resolve…"
              className="min-h-40 w-full resize-none bg-transparent text-base leading-7 text-ink-900 placeholder:text-ink-400 focus:outline-none sm:text-lg"
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
                  <span key={`${file.name}-${index}`} className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-paper-warm px-2.5 py-1.5 text-xs text-ink-700">
                    <Paperclip className="h-3.5 w-3.5" />
                    <span className="max-w-52 truncate">{file.name}</span>
                    <button type="button" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${file.name}`}><X className="h-3.5 w-3.5" /></button>
                  </span>
                ))}
              </div>
            ) : null}
            {error ? <p role="alert" className="mt-4 text-sm text-critical-600">{error}</p> : null}
          </div>

          <div className="flex items-end justify-between gap-3 border-t border-ink-200 bg-paper-warm/60 p-4 sm:px-6 lg:w-52 lg:flex-col lg:items-stretch lg:justify-end lg:border-l lg:border-t-0 lg:p-5">
            <div className="flex gap-1 lg:flex-col">
              <input ref={fileRef} type="file" multiple accept=".pdf,.txt,.doc,.docx,image/*" className="sr-only" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} />
              <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex min-h-10 items-center gap-2 px-2 text-xs font-semibold text-ink-600 hover:text-navy-950">
                <FilePlus2 className="h-4 w-4" /> <span className="hidden sm:inline">Attach document</span>
              </button>
              <button type="button" onClick={() => setCnrOpen(true)} className={cn("inline-flex min-h-10 items-center gap-2 px-2 text-xs font-semibold hover:text-navy-950", cnrOpen ? "text-navy-950" : "text-ink-600")}>
                <Landmark className="h-4 w-4" /> <span className="hidden sm:inline">Add case / CNR</span>
              </button>
            </div>
            <button type="button" onClick={continueToMatter} disabled={busy || statement.trim().length < 10} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-navy-800 px-5 text-sm font-semibold text-white transition-colors hover:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-40">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {showFollowUp ? (
        <div className="mt-5 border border-ink-200 bg-white p-5 sm:p-6">
          <p className="eyebrow text-navy-700">A few things to help refine</p>
          <h3 className="mt-1 font-serif-display text-lg text-navy-950">Optional answers — these help us map your matter</h3>
          <p className="mt-1 text-sm text-ink-500">You can answer some or all. Skip anything you don&apos;t know yet.</p>
          <div className="mt-5 space-y-4">
            {followUp.map((item, index) => (
              <div key={item.question}>
                <label htmlFor={`follow-up-${index}`} className="block text-sm font-medium text-navy-950">{item.question}</label>
                <input
                  id={`follow-up-${index}`}
                  value={item.answer}
                  onChange={(event) => updateAnswer(index, event.target.value)}
                  className="mt-1.5 w-full max-w-2xl rounded-lg border border-ink-200 bg-paper-warm/50 px-3 py-2 text-sm text-ink-900 outline-none transition-colors focus:border-navy-600"
                  placeholder="Your answer…"
                />
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="button" onClick={submitWithAnswers} disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-navy-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-navy-900 disabled:opacity-40">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Add details & continue
            </button>
            <button type="button" onClick={skipFollowUp} disabled={busy} className="text-sm font-semibold text-ink-500 transition-colors hover:text-navy-950 disabled:opacity-40">
              Skip for now
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-x-1.5 gap-y-2" aria-label="Common situations">
        {starters.map((starter) => (
          <button key={starter} type="button" onClick={() => setStatement(starter)} className="rounded-full border border-ink-200 bg-white px-3 py-2 text-xs text-ink-600 transition-colors hover:border-navy-600 hover:bg-navy-100 hover:text-navy-950">
            {starter}
          </button>
        ))}
      </div>
    </div>
  );
}
