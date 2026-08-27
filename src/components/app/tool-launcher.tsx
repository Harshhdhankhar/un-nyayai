"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search, Sparkles } from "lucide-react";

const PROMPT_CHIPS = [
  { label: "Security deposit withheld", q: "My landlord withheld my security deposit without receipts. What legal remedy do I have under Section 74 ICA?" },
  { label: "138 cheque bounce notice", q: "I received a notice under Section 138 NI Act. What is the 15-day limitation and reply procedure?" },
  { label: "Unilateral lease eviction", q: "Can a landlord terminate a registered lease with 48 hours notice under Section 106 TPA?" },
  { label: "Employment bond penalty", q: "Is a training bond or non-compete clause enforceable under Section 27 Contract Act?" },
  { label: "Anticipatory bail BNSS", q: "What is the procedure for anticipatory bail under BNSS Section 482 for a commercial dispute?" },
];

export function WorkspaceConsole() {
  const router = useRouter();
  const [askQuery, setAskQuery] = useState("");

  function handleAskSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!askQuery.trim()) return;
    router.push(`/app/assistant?q=${encodeURIComponent(askQuery.trim())}`);
  }

  return (
    <div className="rounded-2xl border border-border bg-white shadow-xs p-5 sm:p-6 transition-all hover:border-foreground/40">
      <form onSubmit={handleAskSubmit} className="relative flex items-center">
        <input
          type="text"
          value={askQuery}
          onChange={(e) => setAskQuery(e.target.value)}
          placeholder="Describe your legal situation or question in plain words..."
          className="w-full h-13 rounded-xl border border-border bg-[#faf9f6] px-4 py-3 pl-11 pr-36 text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:border-foreground focus:bg-white focus:outline-none transition-colors shadow-2xs"
          autoFocus
        />
        <Search className="absolute left-4 h-4 w-4 text-muted-foreground" />
        <button
          type="submit"
          className="absolute right-2 btn-solid text-xs sm:text-sm py-2 px-4 rounded-lg font-medium flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <span>Ask NyayAI</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </form>

      {/* Suggested Prompt Chips */}
      <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70 mr-1 flex items-center gap-1">
          <Sparkles className="size-3 text-amber-500" />
          Suggested queries:
        </span>
        {PROMPT_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => setAskQuery(chip.q)}
            className="rounded-md border border-border/80 bg-[#f7f5ee]/80 px-2.5 py-1 text-[11px] text-foreground/80 hover:text-foreground hover:border-foreground hover:bg-[#f2efe6] transition-colors font-medium cursor-pointer"
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
