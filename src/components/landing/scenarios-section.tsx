"use client";

import { useState } from "react";
import Link from "next/link";
import { Home, Briefcase, Building, Scale, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

export function ScenariosSection() {
  const [activeScenario, setActiveScenario] = useState<number>(0);

  const scenarios = [
    {
      id: "tenants",
      icon: Home,
      title: "Tenants & Homeowners",
      subtitle: "Security deposit disputes, unlawful eviction notices & maintenance conflicts",
      problem: "Landlord serving 24-hr notice or withholding ₹50k+ security deposit without valid receipts.",
      nyayaiSolution: "Extracts tenancy clauses, calculates statutory notice periods under Section 106 TPA, and drafts legal recovery demand.",
      keyStatute: "Section 106 TPA & Section 74 Indian Contract Act",
      actionCta: "Resolve Tenancy Dispute",
      sampleChecklist: [
        "Inspect deposit deduction clause for statutory validity",
        "Verify 15-day mandatory statutory notice period",
        "Generate formal legal demand notice under Section 106",
      ],
    },
    {
      id: "employees",
      icon: Briefcase,
      title: "Employees & Contractors",
      subtitle: "Unpaid dues, excessive notice period bonds & non-compete clauses",
      problem: "Company withholding relieving letter or demanding ₹2 Lakh 'training bond' penalty upon resignation.",
      nyayaiSolution: "Analyzes employment covenant enforceability under Section 27 of Contract Act (agreements in restraint of trade are void).",
      keyStatute: "Section 27, Indian Contract Act 1872",
      actionCta: "Check Employment Bond Validity",
      sampleChecklist: [
        "Assess liquidated damages vs actual training costs",
        "Generate formal response to employer demand notice",
        "Prepare complaint draft for Labor Commissioner office",
      ],
    },
    {
      id: "msme",
      icon: Building,
      title: "Small Businesses & Founders",
      subtitle: "Section 138 cheque bounce, MSME Samadhaan recovery & contract review",
      problem: "Client bounced a ₹3.5 Lakh invoice cheque or defaulted on payment past 45 days.",
      nyayaiSolution: "Calculates strict 30-day statutory notice countdown under NI Act; auto-fills Section 138 demand notice with bank memo citations.",
      keyStatute: "Section 138, Negotiable Instruments Act 1881",
      actionCta: "Draft Section 138 Notice",
      sampleChecklist: [
        "Verify statutory 30-day notice limitation period",
        "Generate formal statutory legal demand notice",
        "Prepare MSME Samadhaan delayed payment claim",
      ],
    },
    {
      id: "litigants",
      icon: Scale,
      title: "Litigants & Advocates",
      subtitle: "eCourts CNR tracking, order sheet chronology & delay analysis",
      problem: "Tracking multiple hearings across High Court & District Court with unsearchable scanned order sheets.",
      nyayaiSolution: "Syncs directly with NJDG, extracts judicial directions from order sheets, and maps out next hearing action brief.",
      keyStatute: "Civil Procedure Code (Order VIII & Order XXXIX)",
      actionCta: "Track eCourts Matter",
      sampleChecklist: [
        "Sync live cause list and stage for next hearing",
        "Extract past court orders & judge directions",
        "Generate hearing brief with cross-examination points",
      ],
    },
  ];

  const current = scenarios[activeScenario];

  return (
    <section id="scenarios" className="scroll-mt-24 px-6 md:px-12 lg:px-24 py-24 sm:py-32 border-t border-border bg-white">
      <div className="mx-auto w-full max-w-5xl">
        <div className="max-w-2xl">
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.2em] uppercase">
            Everyday Legal Navigation
          </p>
          <h2 className="mt-5 font-serif text-3xl leading-tight sm:text-4xl">
            Built for the legal situations ordinary people face.
          </h2>
          <p className="text-muted-foreground mt-3 text-base leading-relaxed">
            Select a common scenario to see how NyayAI converts complex procedural barriers into step-by-step clarity.
          </p>
        </div>

        {/* Scenario Selector Tabs */}
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {scenarios.map((s, idx) => {
            const Icon = s.icon;
            const isSelected = activeScenario === idx;
            return (
              <button
                key={s.id}
                onClick={() => setActiveScenario(idx)}
                className={`p-4 rounded-lg border text-left transition-all flex flex-col justify-between gap-3 ${
                  isSelected
                    ? "bg-foreground text-background border-foreground shadow-sm"
                    : "bg-[#faf9f6] border-border text-foreground hover:border-foreground/40 hover:bg-white"
                }`}
              >
                <Icon className={`size-5 ${isSelected ? "text-amber-300" : "text-muted-foreground"}`} />
                <div>
                  <span className="font-serif text-sm font-bold block leading-tight">
                    {s.title}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Scenario Card */}
        <div className="mt-6 card !p-6 sm:!p-8 bg-[#fdfcfa] border border-border">
          <div className="grid md:grid-cols-12 gap-8">
            <div className="md:col-span-7 space-y-5">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Typical Challenge
                </span>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-foreground mt-1">
                  {current.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {current.subtitle}
                </p>
              </div>

              <div className="p-3.5 rounded-md bg-red-50/50 border border-red-200/80 text-xs">
                <span className="font-mono font-bold text-red-900 block mb-1">The Pain Point:</span>
                <span className="text-red-950/80">{current.problem}</span>
              </div>

              <div className="p-3.5 rounded-md bg-emerald-50/50 border border-emerald-200/80 text-xs">
                <span className="font-mono font-bold text-emerald-900 block mb-1">NyayAI Grounded Route:</span>
                <span className="text-emerald-950/80">{current.nyayaiSolution}</span>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-muted-foreground">Statutory Basis:</span>
                <span className="font-bold text-foreground bg-paper-warm px-2 py-0.5 rounded border border-border">
                  {current.keyStatute}
                </span>
              </div>
            </div>

            <div className="md:col-span-5 bg-white p-5 rounded-lg border border-border flex flex-col justify-between">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block mb-3 font-semibold">
                  Actionable Next Steps Tree
                </span>
                <ul className="space-y-2.5">
                  {current.sampleChecklist.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground/90">
                      <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-border">
                <Link href="/app" className="btn-solid w-full text-center text-xs py-2.5 rounded-md font-semibold">
                  {current.actionCta} <ArrowRight className="size-3.5 ml-1 inline" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
