"use client";

import { useState } from "react";
import { ArrowRight, FileQuestion, Stamp, Clock, ShieldCheck, Scale, Sparkles } from "lucide-react";

export function LegalAnatomySection() {
  const [selectedItem, setSelectedItem] = useState(0);

  const breakdowns = [
    {
      id: "cnr",
      tag: "01 / The Cryptic Code",
      name: "The 16-Character CNR",
      panic: "Looks like an encrypted launch code on a blurry stamped summons.",
      reality: "It is just District Code + Case Type + Number + Year. Drop it in NyayAI and it instantly reveals your judge, court room number, and when you actually need to show up.",
      example: "DLHC01-004821-2024",
      translation: "Delhi High Court · Single Bench · Court Room 14 · Next Date: 14 Oct",
    },
    {
      id: "stage",
      tag: "02 / Court Jargon",
      name: "Stage: 'P.F. / Process Fee / Steps'",
      panic: "Sounds like an ominous trial phase or imminent arrest warrant.",
      reality: "It literally just means the petitioner forgot to paste a ₹5 postal stamp on the envelope to send notice to the other side. Nothing happened in court today.",
      example: "Status: Awaiting Steps / Process Fee",
      translation: "Meaning: Pure clerk administrative delay. No adverse order passed.",
    },
    {
      id: "deposit",
      tag: "03 / The Bangalore Special",
      name: "The 'Non-Refundable' Deposit Clause",
      panic: "'Lessor reserves sole right to forfeit 3-month deposit for minor wall scuffs.'",
      reality: "Completely illegal. Section 74 of the Indian Contract Act bars penalty clauses. A landlord cannot retain a single rupee without providing actual itemized invoices.",
      example: "Clause 9.2: Deposit forfeited if vacated in month 11",
      translation: "Law: Void ab initio under S. 23 & S. 74 Indian Contract Act.",
    },
    {
      id: "notice",
      tag: "04 / The Threatening Letter",
      name: "The 'Legal Notice Under S. 138' with Red Text",
      panic: "A lawyer sent a 6-page notice in ALL CAPS demanding ₹3 Lakhs in 15 days.",
      reality: "The 15 days is actually a statutory cooling-off window meant to prevent litigation. You have the legal right to reply with your facts before any court case can even be registered.",
      example: "NOTICE: Immediate Criminal Action within 15 Days",
      translation: "Law: Mandatory statutory period to settle or raise genuine factual defense.",
    },
  ];

  const current = breakdowns[selectedItem];

  return (
    <section className="scroll-mt-24 px-6 md:px-12 lg:px-24 py-24 sm:py-32 border-t border-border bg-[#f6f4ec]/60">
      <div className="mx-auto w-full max-w-5xl">
        <div className="max-w-2xl">
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.2em] uppercase">
            Translation Layer
          </p>
          <h2 className="mt-4 font-serif text-3xl sm:text-5xl leading-tight text-balance">
            Half of legal panic is just bad typography and 19th-century vocabulary.
          </h2>
          <p className="text-muted-foreground mt-4 text-base leading-relaxed">
            Click through the four most common things that cause people to lose sleep, and see what they actually mean under Indian law.
          </p>
        </div>

        {/* 4 Interactive Selector Cards */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {breakdowns.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setSelectedItem(idx)}
              className={`p-4 rounded-lg border text-left transition-all flex flex-col justify-between gap-4 ${
                selectedItem === idx
                  ? "bg-foreground text-background border-foreground shadow-sm scale-[1.02]"
                  : "bg-white border-border text-foreground hover:border-foreground/40"
              }`}
            >
              <span className={`font-mono text-[10px] uppercase tracking-wider ${
                selectedItem === idx ? "text-amber-300" : "text-muted-foreground"
              }`}>
                {item.tag}
              </span>
              <span className="font-serif text-sm sm:text-base font-bold leading-snug">
                {item.name}
              </span>
            </button>
          ))}
        </div>

        {/* Decoder Stage */}
        <div className="mt-6 card !p-6 sm:!p-10 bg-white border border-border">
          <div className="grid md:grid-cols-12 gap-8 items-center">
            {/* The Fear */}
            <div className="md:col-span-5 space-y-4">
              <span className="font-mono text-[10px] uppercase tracking-wider text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded font-semibold">
                What you receive (The Fear)
              </span>
              <div className="p-4 rounded-lg bg-[#faf8f4] border border-border font-mono text-xs text-foreground/90 space-y-2">
                <p className="font-bold text-red-950/90">&ldquo;{current.example}&rdquo;</p>
                <p className="text-[11px] text-muted-foreground">{current.panic}</p>
              </div>
            </div>

            {/* The Arrow */}
            <div className="hidden md:flex md:col-span-2 justify-center text-muted-foreground">
              <div className="size-10 rounded-full border border-border flex items-center justify-center bg-[#f8f6f0] font-mono text-xs">
                →
              </div>
            </div>

            {/* The Reality */}
            <div className="md:col-span-5 space-y-4">
              <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                What the law actually says (The Reality)
              </span>
              <div className="p-4 rounded-lg bg-emerald-50/40 border border-emerald-200/80 font-sans text-xs text-emerald-950 space-y-2">
                <p className="font-mono font-semibold text-emerald-900">{current.translation}</p>
                <p className="text-[11px] leading-relaxed text-emerald-950/80">{current.reality}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
