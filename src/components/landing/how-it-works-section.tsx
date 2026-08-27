"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, FileText, Cpu, CheckCircle2, ArrowRightLeft } from "lucide-react";

export function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      step: "01",
      title: "Input your raw file or ordinary words",
      subtitle: "No legal terminology needed",
      description: "Drop a 16-character CNR, upload a scanned rent agreement PDF, or type your situation in plain conversational Hindi or English.",
      visualBadge: "INPUT LAYER",
      sample: "User query: 'Mera landlord deposit wapas nahi de raha aur bol raha hai paint charges ke liye 30k katenge.'",
    },
    {
      step: "02",
      title: "Deterministic Grounding & Extraction",
      subtitle: "Searches official Indian statutes",
      description: "NyayAI extracts specific clauses, cross-references Section 74 of the Indian Contract Act and Section 106 TPA, and checks official eCourts registries.",
      visualBadge: "GROUNDING ENGINE",
      sample: "Found: Clause 9.2 (Penal forfeiture) → Matches Section 74 ICA (Liquidated damages rule) + Section 23 ICA (Void covenants).",
    },
    {
      step: "03",
      title: "Actionable Procedural Roadmap",
      subtitle: "Walk into meetings prepared",
      description: "Receive a chronological event timeline, statutory defense arguments, next court date details, and a formal draft response ready to send.",
      visualBadge: "OUTPUT BRIEF",
      sample: "Output: Ready-to-send statutory demand notice citing S. 74 ICA + Itemized damage verification checklist.",
    },
  ];

  const current = steps[activeStep];

  return (
    <section id="how" className="scroll-mt-24 px-6 md:px-12 lg:px-24 py-24 sm:py-32 border-t border-border bg-white">
      <div className="mx-auto w-full max-w-5xl">
        <div className="max-w-2xl">
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.2em] uppercase">
            The Engine
          </p>
          <h2 className="mt-5 font-serif text-3xl sm:text-5xl leading-tight text-balance">
            From confusing PDF to clear next steps in three seconds.
          </h2>
          <p className="text-muted-foreground mt-4 text-base leading-relaxed">
            Click through the pipeline stages below to see how NyayAI processes legal documents.
          </p>
        </div>

        {/* 3 Step Interactive Switcher */}
        <div className="mt-12 grid sm:grid-cols-3 gap-3">
          {steps.map((s, idx) => (
            <button
              key={s.step}
              onClick={() => setActiveStep(idx)}
              className={`p-5 rounded-lg border text-left transition-all flex flex-col justify-between gap-3 ${
                activeStep === idx
                  ? "bg-foreground text-background border-foreground shadow-sm"
                  : "bg-[#faf9f6] border-border text-foreground hover:border-foreground/40 hover:bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-mono text-xs font-bold ${activeStep === idx ? "text-amber-300" : "text-muted-foreground"}`}>
                  STEP {s.step}
                </span>
                <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                  activeStep === idx ? "bg-white/10 text-white" : "bg-paper-warm text-muted-foreground"
                }`}>
                  {s.visualBadge}
                </span>
              </div>
              <div>
                <h3 className="font-serif text-base font-bold leading-snug">
                  {s.title}
                </h3>
              </div>
            </button>
          ))}
        </div>

        {/* Active Step Canvas */}
        <div className="mt-6 card !p-6 sm:!p-8 bg-[#fdfcfa] border border-border">
          <div className="grid md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-6 space-y-4">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block font-semibold">
                {current.subtitle}
              </span>
              <h3 className="font-serif text-2xl font-bold text-foreground">
                {current.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {current.description}
              </p>
              <div className="pt-2">
                <Link href="/app" className="btn-solid text-xs py-2 px-4 rounded-md">
                  Try it in the workspace <ArrowRight className="size-3.5 ml-1 inline" />
                </Link>
              </div>
            </div>

            <div className="md:col-span-6 bg-white p-5 rounded-lg border border-border space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-border text-[11px] text-muted-foreground">
                <span>SIMULATED PIPELINE TRACE</span>
                <span className="text-emerald-700 font-semibold">● 100% Deterministic</span>
              </div>
              <p className="text-foreground/90 bg-[#f8f6f0] p-3 rounded border border-border/60 leading-relaxed text-[11px]">
                {current.sample}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
