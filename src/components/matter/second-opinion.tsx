"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileSearch, Loader2, ShieldAlert } from "lucide-react";

type Source = { title?: string; citation?: string; authority?: string; url?: string; status?: string };

export function SecondOpinion({ matterId, matterContext }: { matterId: string; matterContext: string }) {
  const [kind, setKind] = useState("settlement offer");
  const [text, setText] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyse(event: React.FormEvent) {
    event.preventDefault();
    if (text.trim().length < 20) return setError("Paste enough of the offer or message to understand its terms.");
    setBusy(true); setError(null); setAnswer(""); setSources([]);
    const prompt = `Provide a neutral second-opinion analysis of this ${kind}. Do not tell me to accept or reject it. Use these exact sections: WHAT YOU RECEIVE; WHAT YOU ARE ASKED TO GIVE UP; WHAT IS UNCLEAR; POTENTIALLY AFFECTED RIGHTS / CLAIMS; ACCEPT — TRADE-OFFS; NEGOTIATE — POINTS TO CLARIFY; CONTINUE / GET ADVICE — WHEN USEFUL; NEXT QUESTIONS. Distinguish verified law from interpretation and cite sources. Matter context: ${matterContext}. Text to analyse: ${text.trim()}`;
    try {
      const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: prompt, matterId, mode: "professional", language: "en", research: true }) });
      if (!response.ok || !response.body) throw new Error("Analysis could not be started.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const eventBlock of events) {
          const eventName = eventBlock.match(/^event: (.+)$/m)?.[1];
          const raw = eventBlock.match(/^data: (.+)$/m)?.[1];
          if (!raw) continue;
          const payload = JSON.parse(raw);
          if (eventName === "delta" && payload.text) setAnswer((current) => current + payload.text);
          if (eventName === "meta" && Array.isArray(payload.sources)) setSources(payload.sources);
          if (eventName === "error") setError(payload.message ?? "The live analysis was interrupted.");
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Analysis failed.");
    } finally { setBusy(false); }
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(19rem,0.75fr)_minmax(0,1.25fr)]">
      <form onSubmit={analyse} className="document-surface self-start border-t-2 border-t-navy-950 p-5 sm:p-7">
        <p className="eyebrow text-navy-700">Rights vs offer</p><h2 className="mt-2 font-serif-display text-3xl text-navy-950">Get a second opinion</h2><p className="mt-2 text-sm leading-6 text-ink-600">See the trade-offs and questions to clarify before making your own decision.</p>
        <label htmlFor="offer-kind" className="eyebrow mt-7 block">Document or offer type</label>
        <select id="offer-kind" value={kind} onChange={(event) => setKind(event.target.value)} className="mt-2 min-h-11 w-full border border-ink-300 bg-white px-3 text-sm text-ink-800">
          {["settlement offer", "resignation", "waiver or release", "agreement", "compensation proposal", "legal notice", "message or email"].map((option) => <option key={option}>{option}</option>)}
        </select>
        <label htmlFor="offer-text" className="eyebrow mt-5 block">Paste the text</label>
        <textarea id="offer-text" value={text} onChange={(event) => setText(event.target.value)} rows={12} maxLength={4000} placeholder="Paste the exact terms, message or relevant clauses…" className="mt-2 w-full resize-y border border-ink-300 bg-white p-3 text-sm leading-6 text-ink-800 placeholder:text-ink-400" />
        {error ? <p role="alert" className="mt-3 text-sm text-critical-600">{error}</p> : null}
        <button disabled={busy || text.trim().length < 20} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-navy-950 px-4 text-sm font-semibold text-white disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />} Analyse trade-offs</button>
        <p className="mt-4 text-[11px] leading-5 text-ink-400">Decision support, not a recommendation or legal advice. Verify important terms with a qualified lawyer.</p>
      </form>

      <section aria-live="polite" className="min-w-0">
        {!answer && !busy ? <div className="flex min-h-80 items-center justify-center border border-dashed border-ink-300 p-8 text-center"><div><ShieldAlert className="mx-auto h-6 w-6 text-ink-400" /><p className="mt-4 font-serif-display text-xl text-navy-950">Your analysis will appear here</p><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink-500">It will compare what you receive, what you may give up, unclear terms, and options to discuss.</p></div></div> : null}
        {busy && !answer ? <div className="border-t-2 border-navy-950 py-8"><p className="eyebrow">Analysing terms and checking sources</p><div className="mt-5 h-px w-full overflow-hidden bg-ink-200"><span className="block h-full w-1/3 animate-pulse bg-navy-700" /></div></div> : null}
        {answer ? <article className="document-surface border-t-2 border-t-navy-950 p-5 sm:p-8"><div className="mb-6 border-b border-amber-300 bg-amber-100/50 px-4 py-3 text-xs font-bold uppercase tracking-[0.11em] text-amber-800">Interpretation — verify before deciding</div><div className="legal-analysis"><ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown></div>{sources.length ? <div className="mt-8 border-t border-ink-200 pt-5"><p className="eyebrow">Sources used</p><ul className="mt-3 space-y-2">{sources.map((source, index) => <li key={`${source.title}-${index}`} className="text-xs text-ink-600">{source.url ? <a href={source.url} target="_blank" rel="noreferrer" className="font-semibold text-navy-800 hover:underline">{source.title ?? "Source"}</a> : <span className="font-semibold text-navy-800">{source.title ?? "Source"}</span>}{source.citation ? ` · ${source.citation}` : ""}</li>)}</ul></div> : null}</article> : null}
      </section>
    </div>
  );
}
