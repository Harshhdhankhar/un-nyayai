"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpenText,
  FilePlus2,
  FolderOpen,
  Landmark,
  MessageSquareText,
  Search,
  Scale,
  Settings,
  CircleHelp,
  ArrowLeftRight,
  BookMarked,
  FolderSearch,
  GitBranch,
  Clock,
  ShieldQuestion,
  FileSearch,
  Sparkles,
  CirclePlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CommandGroup = "Matter" | "Workspace" | "Jump to a matter";

interface Command {
  id: string;
  label: string;
  hint?: string;
  href?: string;
  group: CommandGroup;
  icon: typeof Scale;
  keywords?: string;
  demo?: boolean;
}

interface RecentMatter {
  id: string;
  title: string;
  matterType: string;
}

function currentMatterId(pathname: string): string | null {
  const m = pathname.match(/^\/app\/matters\/([^/]+)/);
  return m ? m[1] : null;
}

export function CommandPalette({
  open,
  onClose,
  recentMatters = [],
}: {
  open: boolean;
  onClose: () => void;
  recentMatters?: RecentMatter[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const matterId = currentMatterId(pathname);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [matterTitle, setMatterTitle] = useState<string | null>(null);
  const [providers, setProviders] = useState<Record<string, string> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const matter = matterId
    ? {
        id: matterId,
        title: matterTitle ?? "Current matter",
        demo: providers?.["indian_kanoon"] === "mock",
      }
    : null;

  // Load current matter title when a matter is open.
  useEffect(() => {
    if (!open || !matterId) return;
    let cancelled = false;
    fetch(`/api/matters/${matterId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.ok && data.matter) setMatterTitle(data.matter.title);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, matterId]);

  // Check provider health once per open so demo/degraded commands are labelled.
  useEffect(() => {
    if (!open || providers) return;
    fetch("/api/providers/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, string> = {};
        for (const p of data?.providers ?? []) map[p.id] = p.status ?? "unverified";
        setProviders(map);
      })
      .catch(() => {});
  }, [open, providers]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const globalCommands: Command[] = [
    { id: "new-matter", label: "Create new matter", hint: "Describe a problem", href: "/app/matters/new", group: "Workspace", icon: CirclePlus, keywords: "new matter create case problem" },
    { id: "matters", label: "View all matters", hint: "Your matters", href: "/app/matters", group: "Workspace", icon: FolderOpen, keywords: "matters list cases" },
    { id: "import-cnr", label: "Import a court case (CNR)", hint: "eCourts", href: "/app/case-status", group: "Workspace", icon: Landmark, keywords: "cnr import ecourts court case lookup", demo: providers?.["ecourts"] === "mock" || providers?.["ecourts"] === "unconfigured" },
    { id: "case-search", label: "Search court records", hint: "By party name", href: "/app/case-status", group: "Workspace", icon: FolderSearch, keywords: "ecourts search case party", demo: providers?.["ecourts"] === "mock" || providers?.["ecourts"] === "unconfigured" },
    { id: "judgment-search", label: "Search case law", hint: "Indian Kanoon", href: "/app/research", group: "Workspace", icon: BookMarked, keywords: "judgment research law kanoon precedent", demo: providers?.["indian_kanoon"] === "mock" || providers?.["indian_kanoon"] === "unconfigured" },
    { id: "ask-ai", label: "Ask NyayAI", hint: "General questions", href: "/app/assistant", group: "Workspace", icon: MessageSquareText, keywords: "ask assistant chat help" },
    { id: "legal-aid", label: "Legal help", href: "/app/legal-aid", group: "Workspace", icon: CircleHelp, keywords: "aid help legal free" },
    { id: "rights", label: "Know your rights", href: "/app/rights", group: "Workspace", icon: BookOpenText, keywords: "rights law" },
    { id: "law-compare", label: "Old vs new law", href: "/app/law-compare", group: "Workspace", icon: ArrowLeftRight, keywords: "compare law bns ipc" },
    { id: "settings", label: "Settings", hint: "Providers, account", href: "/app/settings", group: "Workspace", icon: Settings, keywords: "settings integrations account" },
  ];

  const matterCommands: Command[] = matter
    ? [
        { id: "overview", label: "Open matter", hint: matter.title, href: `/app/matters/${matter.id}/overview`, group: "Matter", icon: Scale, keywords: "open overview" },
        { id: "workbench", label: "Case reasoning", hint: "Issues, claims, sources", href: `/app/matters/${matter.id}/workbench`, group: "Matter", icon: GitBranch, keywords: "workbench reasoning analysis case map" },
        { id: "ask-matter", label: "Ask this matter", hint: "Grounded answers", href: `/app/matters/${matter.id}/workbench`, group: "Matter", icon: MessageSquareText, keywords: "ask this matter question gaps contradictions" },
        { id: "check-contradictions", label: "Check contradictions", hint: "Conflicting records", href: `/app/matters/${matter.id}/workbench`, group: "Matter", icon: ShieldQuestion, keywords: "contradictions conflict disputed" },
        { id: "missing-evidence", label: "Find missing evidence", href: `/app/matters/${matter.id}/evidence`, group: "Matter", icon: FileSearch, keywords: "missing evidence gaps documents" },
        { id: "delay", label: "Analyse delay", href: `/app/matters/${matter.id}/delay-analysis`, group: "Matter", icon: Clock, keywords: "delay adjournment timeline hearing gap" },
        { id: "hearing", label: "Prepare for hearing", href: `/app/matters/${matter.id}/hearings`, group: "Matter", icon: FilePlus2, keywords: "hearing prep briefing next" },
        { id: "opinion", label: "Run second opinion", href: `/app/matters/${matter.id}/second-opinion`, group: "Matter", icon: Sparkles, keywords: "second opinion settlement rights offer" },
        { id: "draft", label: "Generate a draft", href: `/app/matters/${matter.id}/drafts`, group: "Matter", icon: FileSearch, keywords: "draft application pleading letter" },
        { id: "nyaypath", label: "NyayPath", hint: "What happens next", href: `/app/matters/${matter.id}/nyaypath`, group: "Matter", icon: GitBranch, keywords: "nyaypath route steps path stage" },
        { id: "timeline", label: "Timeline", href: `/app/matters/${matter.id}/timeline`, group: "Matter", icon: Clock, keywords: "timeline history events" },
        { id: "documents", label: "Documents", href: `/app/matters/${matter.id}/documents`, group: "Matter", icon: BookOpenText, keywords: "documents upload" },
        { id: "evidence", label: "Evidence", href: `/app/matters/${matter.id}/evidence`, group: "Matter", icon: FileSearch, keywords: "evidence" },
        { id: "add-document", label: "Upload a document", hint: "Agreement, order, notice", href: `/app/matters/${matter.id}/documents`, group: "Matter", icon: FilePlus2, keywords: "upload document add pdf agreement order" },
        { id: "add-evidence", label: "Add evidence", href: `/app/matters/${matter.id}/evidence`, group: "Matter", icon: FileSearch, keywords: "add evidence upload attach proof" },
        { id: "refresh-court", label: "Refresh court status", hint: "eCourts", href: `/app/matters/${matter.id}/case`, group: "Matter", icon: Landmark, keywords: "refresh court status update cnr ecourts latest", demo: providers?.["ecourts"] === "mock" || providers?.["ecourts"] === "unconfigured" },
        { id: "research", label: "Show sources & research", href: `/app/matters/${matter.id}/research`, group: "Matter", icon: BookMarked, keywords: "sources research authority citations" },
      ]
    : [];

  const jumpCommands: Command[] = recentMatters.slice(0, 6).map((m) => ({
    id: `jump-${m.id}`,
    label: m.title,
    hint: m.matterType,
    href: `/app/matters/${m.id}/overview`,
    group: "Jump to a matter",
    icon: Scale,
    keywords: m.title,
  }));

  const all = [...matterCommands, ...globalCommands, ...jumpCommands];

  const filtered = (() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((c) => (c.label + " " + (c.hint ?? "") + " " + (c.keywords ?? "")).toLowerCase().includes(q));
  })();

  // Scroll selected into view.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${selected}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  if (!open) return null;

  const groups: CommandGroup[] = ["Matter", "Workspace", "Jump to a matter"];

  function run(cmd: Command) {
    onClose();
    if (cmd.href) {
      router.push(cmd.href);
      router.refresh();
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Command palette">
      <button className="fixed inset-0 cursor-default bg-navy-950/40 backdrop-blur-[2px]" onClick={onClose} aria-label="Close command palette" tabIndex={-1} />
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-2xl shadow-navy-950/20"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onClose();
          }
        }}
      >
        <div className="flex items-center gap-2 border-b border-ink-200 px-4">
          <Search className="h-4 w-4 shrink-0 text-ink-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelected((s) => Math.min(s + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelected((s) => Math.max(s - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const cmd = filtered[selected];
                if (cmd) run(cmd);
              }
            }}
            placeholder={matter ? `Command for ${matterTitle ?? "this matter"}…` : "Type a command or search…"}
            aria-label="Command"
            className="h-14 w-full bg-transparent text-sm text-navy-950 placeholder:text-ink-400 focus:outline-none"
          />
          <kbd className="hidden shrink-0 rounded border border-ink-200 bg-ink-50 px-1.5 py-0.5 text-[10px] font-semibold text-ink-500 sm:block">esc</kbd>
        </div>

        {!filtered.length ? (
          <div className="p-10 text-center">
            <p className="text-sm text-ink-600">No commands match “{query}”.</p>
            <p className="mt-1 text-xs text-ink-400">Try “matter”, “hearing”, “delay” or “ask”.</p>
          </div>
        ) : (
          <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
            {groups.map((group) => {
              const items = filtered.filter((c) => c.group === group);
              if (!items.length) return null;
              return (
                <div key={group} className="mb-1">
                  {matter ? (
                    <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">{group}</p>
                  ) : (
                    group !== "Matter" && (
                      <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">{group}</p>
                    )
                  )}
                  <div className="space-y-0.5">
                    {items.map((cmd) => {
                      const idx = filtered.indexOf(cmd);
                      const active = idx === selected;
                      return (
                        <button
                          key={cmd.id}
                          type="button"
                          data-index={idx}
                          onMouseEnter={() => setSelected(idx)}
                          onClick={() => run(cmd)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left",
                            active ? "bg-navy-950 text-white" : "text-ink-700"
                          )}
                        >
                          <cmd.icon className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-ink-400")} strokeWidth={1.7} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{cmd.label}</span>
                            {cmd.hint ? <span className={cn("block truncate text-[11px]", active ? "text-white/60" : "text-ink-400")}>{cmd.hint}</span> : null}
                          </span>
                          {cmd.demo ? (
                            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", active ? "bg-amber-300/20 text-amber-200" : "bg-amber-100 text-amber-700")}>
                              demo
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-4 border-t border-ink-200 bg-ink-50/50 px-4 py-2 text-[11px] text-ink-400">
          <span className="flex items-center gap-1"><kbd className="rounded border border-ink-200 bg-white px-1 font-semibold text-ink-500">↑</kbd><kbd className="rounded border border-ink-200 bg-white px-1 font-semibold text-ink-500">↓</kbd> to move</span>
          <span className="flex items-center gap-1"><kbd className="rounded border border-ink-200 bg-white px-1 font-semibold text-ink-500">↵</kbd> to run</span>
          {matter ? <span className="ml-auto truncate text-ink-400">{matterTitle ?? "Working in a matter"}</span> : null}
        </div>
      </div>
    </div>
  );
}
