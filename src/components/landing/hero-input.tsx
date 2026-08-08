"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";

const suggestions = [
  "My landlord hasn't returned my security deposit",
  "My employer has not paid my salary for two months",
  "I received a legal notice from a company",
  "The police called me about an FIR",
];

export function HeroInput() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function submit(text: string) {
    const q = text.trim();
    if (!q) return;
    router.push(`/app/assistant?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-2xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white p-2 shadow-sm focus-within:border-navy-700 focus-within:ring-2 focus-within:ring-navy-100"
      >
        <Search className="ml-2 h-5 w-5 shrink-0 text-ink-400" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Tell us what happened, in your own words…"
          aria-label="Describe your legal problem"
          className="h-11 w-full bg-transparent text-[15px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
        />
        <button
          type="submit"
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-navy-900 px-5 text-sm font-medium text-white transition-colors hover:bg-navy-800"
        >
          Start
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => submit(s)}
            className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-500 transition-colors hover:border-navy-300 hover:text-navy-800"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
