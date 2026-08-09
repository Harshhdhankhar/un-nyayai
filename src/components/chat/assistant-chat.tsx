"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send,
  Loader2,
  MessageSquare,
  Plus,
  Trash2,
  Scale,
  Gavel,
  Scroll,
  Stethoscope,
  HeartHandshake,
  Timer,
  FileText,
  BookOpen,
  Landmark,
  CornerDownLeft,
  Pause,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { VerificationBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ChatSource {
  id: string;
  title: string;
  type: string;
  authority?: string;
  date?: string;
  citation?: string;
  excerpt?: string;
  url?: string;
  relevanceScore?: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  mode?: "live" | "offline";
  verification?: { status: string } | null;
}

interface Thread {
  id: string;
  title: string;
  matterId: string | null;
  updatedAt: string;
}

type Status = "idle" | "streaming" | "done";

const SUGGESTIONS = [
  {
    icon: Scale,
    label: "Deposit not returned",
    prompt: "My landlord kept my security deposit after I moved out. What can I do?",
  },
  {
    icon: Gavel,
    label: "Been fired unfairly",
    prompt: "My employer fired me without notice and I think it was unfair. What are my rights?",
  },
  {
    icon: Scroll,
    label: "Got a legal notice",
    prompt: "I received a legal notice demanding money I don't owe. How should I respond?",
  },
  {
    icon: Stethoscope,
    label: "Medical negligence",
    prompt: "I was given wrong treatment at a hospital and my condition worsened. What can I claim?",
  },
  {
    icon: HeartHandshake,
    label: "Family dispute",
    prompt: "My in-laws are claiming rights over property I bought. What should I do?",
  },
  {
    icon: Timer,
    label: "Delayed payment",
    prompt: "A client hasn't paid me for work I completed two months ago. How do I recover it?",
  },
];

const SOURCE_ICONS: Record<string, typeof FileText> = {
  section: BookOpen,
  judgment: Landmark,
  document: FileText,
  statute: Scroll,
  ecourts: Scale,
};

function sourceIcon(type: string) {
  return SOURCE_ICONS[type] ?? FileText;
}

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function AssistantChat({
  initialQuestion,
}: {
  initialQuestion?: string;
}) {
  const params = useSearchParams();
  const [input, setInput] = useState(initialQuestion ?? "");
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [threadId, setThreadId] = useState<string | undefined>();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [showSessions, setShowSessions] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [mode, setMode] = useState<"simple" | "detailed" | "professional">("simple");
  const [language, setLanguage] = useState<"en" | "hi" | "hinglish">("en");
  const [research, setResearch] = useState(false);
  const [thinkingLabel, setThinkingLabel] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/threads", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.ok) setThreads(data.threads ?? []);
    } catch {
      // offline — ignore
    }
  }, []);

  useEffect(() => {
    // Initial remote synchronization is intentionally performed after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    const q = params.get("q");
    if (q) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInput(q);
      const t = setTimeout(() => send(q), 0);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  async function loadThread(thread: Thread) {
    if (status === "streaming") return;
    abortRef.current?.abort();
    setLoadingThread(true);
    setThreadId(thread.id);
    try {
      const res = await fetch(`/api/threads/${thread.id}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const loaded: Message[] = (data.messages ?? []).map((m: {
        id: string;
        role: string;
        content: string;
        sources?: unknown;
        verification?: unknown;
      }) => ({
        id: m.id,
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content ?? "",
        sources: (m.sources as ChatSource[]) ?? [],
        verification: (m.verification as { status: string } | null) ?? null,
      }));
      setMessages(loaded);
    } finally {
      setLoadingThread(false);
    }
  }

  function newSession() {
    abortRef.current?.abort();
    setThreadId(undefined);
    setMessages([]);
    setStatus("idle");
    setInput("");
    setThinkingLabel(null);
    inputRef.current?.focus();
  }

  function stopGeneration() {
    abortRef.current?.abort();
    setStatus("done");
  }

  async function deleteSession(thread: Thread) {
    if (status === "streaming") return;
    try {
      await fetch(`/api/threads/${thread.id}`, { method: "DELETE" });
      setThreads((t) => t.filter((x) => x.id !== thread.id));
      if (threadId === thread.id) newSession();
    } catch {
      // ignore
    }
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || status === "streaming") return;
    setInput("");
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", content: message }]);
    setStatus("streaming");
    setThinkingLabel(null);
    const assistantId = crypto.randomUUID();
    setMessages((m) => [...m, { id: assistantId, role: "assistant", content: "" }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message,
          threadId,
          mode,
          language,
          research,
        }),
      });
      if (!res.ok || !res.body) {
        throw new Error("Request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let mode_: "live" | "offline" = "live";
      let activeThreadId = threadId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const block of events) {
          const lines = block.split("\n");
          const event = lines.find((l) => l.startsWith("event:"))?.slice(6).trim();
          const dataLine = lines.find((l) => l.startsWith("data:"))?.slice(5).trim();
          if (!dataLine) continue;
          const data = JSON.parse(dataLine);
          if (event === "meta") {
            mode_ = data.mode ?? "live";
            if (data.threadId) {
              activeThreadId = data.threadId;
              setThreadId(data.threadId);
            }
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantId
                  ? { ...msg, mode: mode_, sources: data.sources ?? [] }
                  : msg
              )
            );
          } else if (event === "status") {
            setThinkingLabel(data.label ?? "Thinking…");
          } else if (event === "delta") {
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantId
                  ? { ...msg, content: msg.content + data.text }
                  : msg
              )
            );
          } else if (event === "done") {
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantId
                  ? { ...msg, verification: data.verification ?? null }
                  : msg
              )
            );
            if (data.threadId) activeThreadId = data.threadId;
            setThreadId(activeThreadId);
          } else if (event === "error") {
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantId ? { ...msg, content: data.message } : msg
              )
            );
          }
        }
      }
      loadThreads();
    } catch {
      // aborted or failed
      setMessages((m) =>
        m.map((msg) =>
          msg.id === assistantId
            ? {
                ...msg,
                content:
                  msg.content || "Something went wrong. Please try again.",
              }
            : msg
        )
      );
    } finally {
      setStatus("done");
      setThinkingLabel(null);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  function autosize() {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  const isStreaming = status === "streaming";

  return (
    <div className="flex h-[calc(100dvh-8rem)] gap-4">
      {/* Sessions sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm transition-all md:flex",
          showSessions ? "w-72" : "w-14"
        )}
      >
        <div className={cn("border-b border-ink-100 p-3", !showSessions && "p-2")}>
          <button
            type="button"
            onClick={() => setShowSessions((s) => !s)}
            className={cn(
              "flex w-full items-center rounded-xl bg-navy-900 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-800",
              !showSessions && "justify-center px-0"
            )}
            aria-label="New session"
            title="New session"
          >
            <Plus className="h-4 w-4 shrink-0" />
            {showSessions && <span className="ml-2">New session</span>}
          </button>
        </div>

        <div
          className={cn(
            "flex-1 overflow-y-auto p-2",
            !showSessions && "flex flex-col items-center p-2"
          )}
        >
          {showSessions && threads.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-ink-400">
              No saved sessions yet.
            </p>
          )}
          {threads.map((thread) => {
            const active = threadId === thread.id;
            return (
              <div
                key={thread.id}
                role="button"
                tabIndex={0}
                onClick={() => loadThread(thread)}
                onKeyDown={(e) => e.key === "Enter" && loadThread(thread)}
                className={cn(
                  "group mb-1 flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-navy-100/70 text-navy-900"
                    : "text-ink-700 hover:bg-ink-100",
                  !showSessions && "justify-center px-0 py-2.5"
                )}
                title={showSessions ? thread.title : undefined}
              >
                <MessageSquare className="h-4 w-4 shrink-0 text-ink-400" />
                {showSessions && (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{thread.title}</span>
                      <span className="block text-[11px] text-ink-400">
                        {timeAgo(thread.updatedAt)}
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label="Delete session"
                      className="hidden shrink-0 rounded-md p-1 text-ink-400 transition-colors hover:bg-white hover:text-red-600 group-hover:block"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(thread);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setShowSessions((s) => !s)}
          className="flex items-center justify-center gap-1 border-t border-ink-100 p-3 text-xs font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-700"
        >
          {showSessions ? (
            <>
              <ChevronLeft className="h-3.5 w-3.5" /> Hide
            </>
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
      </aside>

      {/* Main chat column */}
        <div className="flex min-w-0 flex-1 flex-col border border-ink-200 bg-white">
        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b border-ink-100 px-4 py-3">
          <button
            type="button"
            onClick={() => setShowSessions((s) => !s)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs font-medium text-ink-700 transition-colors hover:border-navy-300 hover:text-navy-800 md:hidden"
            aria-label="Toggle sessions"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {threads.length > 0 && (
              <span className="rounded-full bg-ink-100 px-1.5 text-[10px] font-semibold text-ink-600">
                {threads.length}
              </span>
            )}
          </button>

          {/* Mode segmented control */}
          <div className="flex items-center rounded-lg bg-ink-100 p-0.5">
            {(["simple", "detailed", "professional"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                  mode === m
                    ? "bg-white text-navy-900 shadow-sm"
                    : "text-ink-500 hover:text-ink-700"
                )}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Language segmented control */}
          <div className="flex items-center rounded-lg bg-ink-100 p-0.5">
            {(["en", "hinglish", "hi"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLanguage(l)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                  language === l
                    ? "bg-white text-navy-900 shadow-sm"
                    : "text-ink-500 hover:text-ink-700"
                )}
              >
                {l === "en" ? "English" : l === "hi" ? "हिन्दी" : "Hinglish"}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setResearch((r) => !r)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                research
                  ? "border-navy-700 bg-navy-100/60 text-navy-800"
                  : "border-ink-200 bg-white text-ink-500 hover:border-navy-300 hover:text-navy-800"
              )}
              title="Search Indian Kanoon for judgments while answering"
            >
              <Landmark className="h-3.5 w-3.5" />
              Research
            </button>
            <button
              type="button"
              onClick={newSession}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs font-medium text-ink-700 transition-colors hover:border-navy-300 hover:text-navy-800"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
            {loadingThread && (
              <div className="flex items-center justify-center gap-2 py-16 text-xs text-ink-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading conversation…
              </div>
            )}

            {!loadingThread && messages.length === 0 && !isStreaming && (
              <div className="flex flex-col items-center px-4 pt-16 text-center">
                <p className="eyebrow text-navy-700">Structured legal guidance</p>
                <h2 className="mt-3 font-serif-display text-3xl text-navy-950">
                  What do you need to understand?
                </h2>
                <p className="mt-1 max-w-md text-sm text-ink-500">
                  Describe what happened in your own words — no legal
                  knowledge needed. NyayAI will explain your options and the
                  law that applies.
                </p>

                <div className="mt-8 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => send(s.prompt)}
                      className="group flex items-start gap-3 border border-ink-200 bg-white p-3.5 text-left transition-colors hover:border-navy-700"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-navy-100 bg-navy-100 text-navy-800 transition-colors group-hover:bg-navy-900 group-hover:text-white">
                        <s.icon className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-ink-900">
                          {s.label}
                        </span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
                          {s.prompt}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn("flex gap-3", msg.role === "user" && "justify-end")}
              >
                {msg.role === "assistant" && <span className="mt-1 w-8 shrink-0 text-[9px] font-bold uppercase tracking-[0.12em] text-navy-700">NyayAI</span>}
                <div
                  className={cn(
                    "min-w-0 space-y-2",
                    msg.role === "assistant" ? "max-w-[85%]" : "max-w-[85%]"
                  )}
                >
                  <div
                    className={cn(
                    "px-4 py-3 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "border-l-2 border-navy-900 bg-paper-warm text-ink-800"
                        : "border-y border-ink-200 bg-white text-ink-900"
                    )}
                  >
                    {msg.role === "user" ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : msg.content === "" && isStreaming ? (
                      <TypingIndicator />
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({ ...props }) => (
                            <a {...props} className="text-navy-700 underline hover:text-navy-900" target="_blank" rel="noreferrer" />
                          ),
                          strong: ({ ...props }) => <strong className="font-semibold" {...props} />,
                          h1: ({ ...props }) => <h1 className="mb-2 mt-3 text-base font-semibold" {...props} />,
                          h2: ({ ...props }) => <h2 className="mb-2 mt-3 text-sm font-semibold" {...props} />,
                          h3: ({ ...props }) => <h3 className="mb-2 mt-3 text-sm font-semibold" {...props} />,
                          p: ({ ...props }) => <p className="mb-2 leading-relaxed last:mb-0" {...props} />,
                          ul: ({ ...props }) => <ul className="mb-2 list-disc pl-5" {...props} />,
                          ol: ({ ...props }) => <ol className="mb-2 list-decimal pl-5" {...props} />,
                          li: ({ ...props }) => <li className="mb-0.5" {...props} />,
                          hr: ({ ...props }) => <hr className="my-3 border-ink-200" {...props} />,
                          em: ({ ...props }) => <em className="text-ink-500" {...props} />,
                          code: ({ ...props }) => (
                            <code className="rounded bg-ink-100 px-1 py-0.5 font-mono text-xs" {...props} />
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>

                  {isStreaming && msg.id === messages[messages.length - 1]?.id && thinkingLabel && (
                    <div className="flex items-center gap-1.5 pl-0.5 text-xs text-ink-400">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {thinkingLabel}
                    </div>
                  )}

                  {msg.role === "assistant" && (
                    <div className="flex flex-wrap items-center gap-2 pl-0.5">
                      {msg.mode === "offline" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                          Offline guidance
                        </span>
                      )}
                      {msg.verification && (
                        <VerificationBadge status={msg.verification.status} />
                      )}
                    </div>
                  )}

                  {msg.sources && msg.sources.length > 0 && (
                    <SourceList sources={msg.sources} />
                  )}
                </div>
                {msg.role === "user" && <span className="mt-1 w-8 shrink-0 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-ink-400">You</span>}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-ink-100 p-4">
          <div className="mx-auto max-w-3xl">
            <form
              className="flex items-end gap-2 border border-ink-300 bg-white p-2 pl-4 transition-colors focus-within:border-navy-700 focus-within:ring-2 focus-within:ring-navy-100"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  autosize();
                }}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Describe your situation…"
                aria-label="Message NyayAI"
                className="max-h-40 flex-1 resize-none bg-transparent py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
              />
              {isStreaming ? (
                <button
                  type="button"
                  onClick={stopGeneration}
                  aria-label="Stop generating"
                  title="Stop generating"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center bg-critical-600 text-white transition-colors hover:bg-red-700"
                >
                  <Pause className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="Send"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center bg-navy-900 text-white transition-colors hover:bg-navy-800 disabled:bg-ink-200 disabled:text-ink-400"
                >
                  <Send className="h-4 w-4" />
                </button>
              )}
            </form>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-ink-400">
              <CornerDownLeft className="h-3 w-3" />
              Enter to send · Shift + Enter for a new line · NyayAI gives
              guidance, not legal advice
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <span className="inline-flex items-center gap-2 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-ink-400">
      <span className="h-px w-8 animate-pulse bg-navy-700" /> Reviewing the record
    </span>
  );
}

function SourceList({ sources }: { sources: ChatSource[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-ink-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5"
      >
        <span className="inline-flex items-center gap-2 text-xs font-medium text-ink-700">
          <BookOpen className="h-3.5 w-3.5 text-navy-700" />
          Sources ({sources.length})
        </span>
        <span
          className={cn(
            "transition-transform",
            open && "rotate-90"
          )}
        >
          <ChevronRight className="h-3.5 w-3.5 text-ink-400" />
        </span>
      </button>
      {open && (
        <div className="space-y-2 border-t border-ink-100 p-2.5">
          {sources.map((s) => {
            const SIcon = sourceIcon(s.type);
            return (
              <div
                key={s.id}
                className="group rounded-lg bg-ink-100/50 p-2.5 transition-colors hover:bg-ink-100"
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-navy-700 shadow-sm">
                    <SIcon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium leading-snug text-ink-900">
                      {s.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-500">
                      {[
                        s.type.charAt(0).toUpperCase() + s.type.slice(1),
                        s.authority,
                        s.date,
                        s.citation,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  {s.url && (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-navy-700 opacity-0 transition-opacity hover:underline group-hover:opacity-100"
                    >
                      Open
                    </a>
                  )}
                </div>
                {s.excerpt && (
                  <p className="mt-1.5 line-clamp-3 pl-8 text-[11px] leading-relaxed text-ink-500">
                    {s.excerpt}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
