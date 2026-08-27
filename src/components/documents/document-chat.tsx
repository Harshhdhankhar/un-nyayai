"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { AnalysisResult, RiskLevel } from "@/lib/documents/types";

interface ChatMessageView {
  role: "user" | "assistant";
  content: string;
  citations?: { page: number | null; label: string }[];
}

const SUGGESTIONS = [
  "What are my obligations?",
  "Explain the termination clause.",
  "What happens if I leave early?",
  "Which clauses are risky?",
  "Summarize this in simple language.",
  "Find all payment-related clauses.",
];

export function DocumentChat({
  documentId,
  documentName,
  analysis,
}: {
  documentId: string;
  documentName: string;
  analysis: AnalysisResult | null;
}) {
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/documents/${documentId}/chat`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setMessages(data.messages ?? []);
      })
      .finally(() => setLoaded(true));
  }, [documentId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, streaming]);

  async function send(text?: string) {
    const question = (text ?? input).trim();
    if (!question || streaming) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: question }, { role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
      });
      if (!res.body) throw new Error("no stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let citations: ChatMessageView["citations"];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const eventLine = frame.split("\n").find((l) => l.startsWith("event: "));
          const dataLine = frame.split("\n").find((l) => l.startsWith("data: "));
          if (!eventLine || !dataLine) continue;
          const event = eventLine.slice(7).trim();
          const payload = JSON.parse(dataLine.slice(6));
          if (event === "delta") {
            setMessages((m) => {
              const next = [...m];
              next[next.length - 1] = {
                ...next[next.length - 1],
                content: next[next.length - 1].content + payload.text,
              };
              return next;
            });
          } else if (event === "done") {
            citations = payload.citations;
          }
        }
      }
      setMessages((m) => {
        const next = [...m];
        next[next.length - 1] = { ...next[next.length - 1], citations };
        return next;
      });
    } catch {
      setMessages((m) => {
        const next = [...m];
        next[next.length - 1] = {
          ...next[next.length - 1],
          content: next[next.length - 1].content || "Something went wrong. Please try again.",
        };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }

  // Context summary injected as a first assistant message so answers feel anchored.
  const contextIntro = analysis
    ? `You're chatting about “${documentName}” — classified as ${analysis.documentType.name} (${Math.round(analysis.documentType.confidence * 100)}% confidence). Answers are grounded in this document only.`
    : `You're chatting about “${documentName}”. Answers are grounded in this document only.`;

  return (
    <div className="flex h-[34rem] flex-col rounded-lg border border-ink-200 bg-white">
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {!loaded ? (
          <p className="text-xs text-ink-400">Loading conversation…</p>
        ) : (
          <>
            <p className="rounded-md bg-navy-100 px-3 py-2 text-xs leading-5 text-navy-800">{contextIntro}</p>
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-6 ${
                    m.role === "user" ? "bg-navy-700 text-white" : "bg-ink-50 text-ink-800"
                  }`}
                >
                  {m.content ||
                    (streaming && i === messages.length - 1 ? (
                      <Loader2 className="h-4 w-4 animate-spin text-ink-400" />
                    ) : null)}
                  {m.citations && m.citations.length > 0 && (
                    <div className="mt-2 space-y-0.5 border-t border-ink-200 pt-1.5">
                      {m.citations.map((c, ci) => (
                        <p key={ci} className="text-[11px] font-semibold text-navy-700">
                          Source: {c.page ? `Page ${c.page} — ` : ""}
                          {c.label}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-1.5 border-t border-ink-100 px-4 py-2.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              disabled={streaming}
              className="rounded-full border border-ink-200 px-2.5 py-1 text-xs text-ink-600 transition-colors hover:border-navy-700 hover:text-navy-800 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="flex items-center gap-2 border-t border-ink-200 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this document…"
          disabled={streaming}
          className="h-9 flex-1 rounded-md border border-ink-200 bg-white px-3 text-sm outline-none focus:border-navy-700 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="h-9 shrink-0 rounded-md bg-navy-700 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-50"
        >
          Ask
        </button>
      </form>
    </div>
  );
}

export type { RiskLevel };
