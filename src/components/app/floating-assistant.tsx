"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Scale,
  X,
  Minus,
  Send,
  Loader2,
  Mic,
  MicOff,
  BookOpen,
  ShieldCheck,
  Plus,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatSource {
  id: string;
  title: string;
  type: string;
  authority?: string;
  date?: string;
  citation?: string;
  excerpt?: string;
  url?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  isStreaming?: boolean;
}

const CONTEXT_SUGGESTIONS: Record<string, { label: string; prompt: string }[]> = {
  "/app/case-status": [
    { label: "Explain court stage", prompt: "Explain what 'Stage: Arguments on Charge / Process Fee' means in Indian court procedure." },
    { label: "Limitation for appeal", prompt: "What is the statutory limitation period to file an appeal against an interim order in High Court?" },
    { label: "Search by party name", prompt: "How do I find a case in Delhi High Court if I only know the respondent company name?" },
  ],
  "/app/documents": [
    { label: "Flag predatory terms", prompt: "What are the common illegal or predatory clauses in Indian residential rental agreements?" },
    { label: "Notice period validity", prompt: "Can an employer enforce a 90-day notice period or withhold relieving letter under Section 27 Contract Act?" },
    { label: "Liquidated damages rule", prompt: "How does Section 74 of the Indian Contract Act apply to forfeiture of security deposits?" },
  ],
  "/app/matters": [
    { label: "Procedural roadmap", prompt: "What are the standard procedural stages for a civil suit under Order VIII CPC?" },
    { label: "Evidence checklist", prompt: "What electronic evidence certificates are required under Section 65B of BSA 2023?" },
    { label: "Cross-examination prep", prompt: "What key questions should be prepared for cross-examining a witness in a cheque bounce matter?" },
  ],
  "default": [
    { label: "Deposit withheld", prompt: "My landlord withheld my security deposit without receipts. What legal remedy do I have?" },
    { label: "138 cheque notice", prompt: "I received a notice under Section 138 NI Act. What is the 15-day limitation and reply procedure?" },
    { label: "Unilateral lease eviction", prompt: "Can a landlord terminate a registered lease with 48 hours notice under Section 106 TPA?" },
    { label: "Employment bond legality", prompt: "Is a training bond or non-compete clause enforceable under Section 27 Contract Act?" },
  ],
};

export function FloatingAssistant({
  user,
}: {
  user?: {
    id: string;
    fullName: string | null;
    email: string;
  };
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "✦ **Hello.** I'm NyayAI, your legal navigation assistant.\n\nDescribe a dispute, agreement clause, or court inquiry in plain words. I reason step-by-step from verified Indian statutes (BNS, CPC, TPA, NI Act) and official eCourts registries.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [threadId, setThreadId] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized]);

  // Context detection based on current URL
  function getContextBadge() {
    if (pathname.includes("/case-status")) {
      return searchParams.get("tab") === "search" ? "Case Search Context" : "Case Tracker Context";
    }
    if (pathname.includes("/documents")) return "Doc Analyzer Context";
    if (pathname.includes("/matters")) return "Matter Dossier Context";
    if (pathname.includes("/rights")) return "Legal Rights Context";
    if (pathname.includes("/law-compare")) return "BNS Statute Context";
    return "Workspace Context";
  }

  function getSuggestions() {
    if (pathname.includes("/case-status")) return CONTEXT_SUGGESTIONS["/app/case-status"];
    if (pathname.includes("/documents")) return CONTEXT_SUGGESTIONS["/app/documents"];
    if (pathname.includes("/matters")) return CONTEXT_SUGGESTIONS["/app/matters"];
    return CONTEXT_SUGGESTIONS["default"];
  }

  // Voice Input via Web Speech API
  function toggleSpeechToText() {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-IN"; // English (India) + Hinglish friendly
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  }

  async function sendMessage(textToSend?: string) {
    const query = (textToSend ?? input).trim();
    if (!query || loading) return;

    setInput("");
    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `assistant-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: query },
      { id: assistantMsgId, role: "assistant", content: "", isStreaming: true },
    ]);
    setLoading(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          threadId,
          mode: "detailed",
          language: "en",
          context: {
            pathname,
            pageType: getContextBadge(),
            contextSummary: `User is currently viewing ${pathname} with ${getContextBadge()}`,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Assistant request failed");
      }

      if (!response.body) {
        throw new Error("No response stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamBuffer = "";
      let accumulatedText = "";
      let retrievedSources: ChatSource[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.split("\n\n");
        streamBuffer = lines.pop() ?? "";

        for (const block of lines) {
          if (!block.trim()) continue;
          const eventMatch = block.match(/event: (\w+)/);
          const dataMatch = block.match(/data: (.*)/);
          const eventType = eventMatch ? eventMatch[1] : null;
          const dataStr = dataMatch ? dataMatch[1] : null;

          if (!eventType || !dataStr) continue;

          try {
            const data = JSON.parse(dataStr);
            if (eventType === "meta") {
              if (data.threadId) setThreadId(data.threadId);
              if (data.sources) retrievedSources = data.sources;
            } else if (eventType === "delta") {
              accumulatedText += data.text || "";
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? { ...msg, content: accumulatedText, sources: retrievedSources }
                    : msg
                )
              );
            } else if (eventType === "done") {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? { ...msg, isStreaming: false, sources: retrievedSources }
                    : msg
                )
              );
            }
          } catch {
            // Ignore parse chunk errors
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content:
                  "I'm sorry, I could not complete that query. Please try again or rephrase your question.",
                isStreaming: false,
              }
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function clearChat() {
    setThreadId(undefined);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "✦ **New Session.** What legal scenario or document would you like to examine?",
      },
    ]);
  }

  return (
    <>
      {/* ── 1. Closed Floating Launcher Button ── */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 group">
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
            }}
            aria-label="Ask NyayAI Legal Assistant"
            className="flex items-center gap-2.5 h-[52px] px-3.5 sm:px-4 rounded-full bg-[#111418] text-white shadow-xl hover:shadow-2xl border border-border/40 hover:scale-[1.03] transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-md"
          >
            <div className="size-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <Scale className="size-4 text-amber-300" />
            </div>
            <span className="max-w-0 sm:group-hover:max-w-xs transition-all duration-300 ease-out whitespace-nowrap overflow-hidden font-mono text-xs font-semibold text-white/95">
              ✦ Ask NyayAI
            </span>
          </button>
        </div>
      )}

      {/* ── 2. Open Floating Chat Panel ── */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-50 transition-all duration-200 ease-out flex flex-col bg-white border border-border shadow-2xl overflow-hidden",
            isMinimized
              ? "bottom-6 right-6 w-80 h-14 rounded-2xl"
              : "fixed inset-x-2 bottom-2 top-12 sm:inset-auto sm:right-6 sm:bottom-6 sm:w-[410px] sm:h-[620px] sm:max-h-[calc(100vh-48px)] rounded-2xl"
          )}
        >
          {/* Header */}
          <div className="bg-[#111418] text-white px-4 py-3 flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <Scale className="size-3.5 text-amber-300" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-white">NyayAI</span>
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-white/15 text-emerald-300 font-semibold truncate">
                    {getContextBadge()}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-white/60 block truncate">
                  Grounded Indian Legal Copilot
                </span>
              </div>
            </div>

            {/* Header Controls */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={clearChat}
                title="Start new conversation"
                className="p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Plus className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? "Expand" : "Minimize"}
                className="p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors hidden sm:block"
              >
                {isMinimized ? <Maximize2 className="size-3.5" /> : <Minus className="size-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close assistant"
                className="p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Body Content (only visible when not minimized) */}
          {!isMinimized && (
            <>
              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#fbfaf7]/60 text-xs">
                {messages.map((msg) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={msg.id}
                      className={cn("flex flex-col gap-1.5", isUser ? "items-end" : "items-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-2xs leading-relaxed text-xs",
                          isUser
                            ? "bg-foreground text-background rounded-tr-xs font-sans font-medium"
                            : "bg-white border border-border/80 text-foreground rounded-tl-xs"
                        )}
                      >
                        {isUser ? (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <div className="prose prose-xs max-w-none text-foreground/90 font-sans space-y-2">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content || (msg.isStreaming ? "Thinking through applicable statutes…" : "")}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>

                      {/* Expandable Citations / Sources Badge for Assistant */}
                      {!isUser && msg.sources && msg.sources.length > 0 && (
                        <div className="max-w-[88%] pl-1 space-y-1">
                          <details className="group text-[10px] font-mono text-muted-foreground">
                            <summary className="cursor-pointer hover:text-foreground inline-flex items-center gap-1 list-none select-none font-semibold">
                              <BookOpen className="size-3 text-emerald-600" />
                              <span>{msg.sources.length} Verified Sources Grounded</span>
                              <span className="group-open:rotate-180 transition-transform">▾</span>
                            </summary>
                            <div className="mt-1.5 space-y-1 bg-white p-2 rounded-lg border border-border">
                              {msg.sources.map((s, idx) => (
                                <div key={s.id || idx} className="text-[10px] border-b last:border-b-0 pb-1 pt-0.5 border-border/50">
                                  <span className="font-bold text-foreground block">{s.title}</span>
                                  {s.authority && <span className="text-muted-foreground block">{s.authority}</span>}
                                  {s.excerpt && (
                                    <p className="text-muted-foreground/80 line-clamp-2 mt-0.5 italic">
                                      &ldquo;{s.excerpt}&rdquo;
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Contextual Suggestions Chips */}
              <div className="px-3 py-2 bg-white border-t border-border/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground shrink-0">
                  Quick Actions:
                </span>
                {getSuggestions().map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => sendMessage(s.prompt)}
                    className="whitespace-nowrap rounded-md border border-border bg-[#f8f6f0] px-2 py-0.5 text-[10px] font-mono text-foreground hover:border-foreground hover:bg-white transition-colors cursor-pointer"
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Input Footer */}
              <div className="p-3 bg-white border-t border-border shrink-0">
                <div className="relative flex items-center">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe your legal situation or question..."
                    rows={1}
                    className="w-full resize-none rounded-xl border border-border bg-[#faf9f6] py-2.5 pl-3 pr-20 text-xs text-foreground placeholder:text-muted-foreground focus:border-foreground focus:bg-white focus:outline-none transition-colors max-h-24 leading-relaxed"
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    {/* Voice Mic Button */}
                    <button
                      type="button"
                      onClick={toggleSpeechToText}
                      title={isListening ? "Listening... click to stop" : "Speak in Hindi or English"}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors cursor-pointer",
                        isListening
                          ? "bg-red-500 text-white animate-pulse"
                          : "text-muted-foreground hover:text-foreground hover:bg-paper-warm"
                      )}
                    >
                      {isListening ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
                    </button>

                    {/* Send Button */}
                    <button
                      type="button"
                      disabled={!input.trim() || loading}
                      onClick={() => sendMessage()}
                      title="Send question"
                      className="p-1.5 rounded-lg bg-foreground text-background hover:opacity-90 disabled:opacity-30 transition-all cursor-pointer"
                    >
                      {loading ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Send className="size-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[9px] font-mono text-muted-foreground/70">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="size-2.5 text-emerald-600" />
                    Aadhaar/PAN redacted client-side
                  </span>
                  <span>Press ↵ to send</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
