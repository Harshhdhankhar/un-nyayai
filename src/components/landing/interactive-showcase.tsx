"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldAlert, Scale, ArrowRight, CheckCircle2, Clock, MapPin, Building2, AlertTriangle, Sparkles, Search } from "lucide-react";

export function InteractiveShowcase() {
  const [activeTab, setActiveTab] = useState<"dossier" | "risk" | "converter" | "assistant">("dossier");
  const [searchTerm, setSearchTerm] = useState("420");

  const bnsDatabase: Record<string, { ipc: string; bns: string; title: string; penalty: string; keyChange: string }> = {
    "420": {
      ipc: "Section 420 IPC",
      bns: "Section 318(4) BNS",
      title: "Cheating and dishonestly inducing delivery of property",
      penalty: "Imprisonment up to 7 years + fine",
      keyChange: "Organized financial fraud enhanced penalties; modernized digital electronic record definitions under BSA Section 61.",
    },
    "302": {
      ipc: "Section 302 IPC",
      bns: "Section 103(1) BNS",
      title: "Punishment for Murder",
      penalty: "Death or imprisonment for life + fine",
      keyChange: "Section 103(2) introduced for mob lynching/hate killings with death or life imprisonment.",
    },
    "379": {
      ipc: "Section 379 IPC",
      bns: "Section 303(2) BNS",
      title: "Punishment for Theft",
      penalty: "Imprisonment up to 3 years, or fine, or both",
      keyChange: "Community service introduced as an alternative penalty for petty theft under ₹5,000 for first-time offenders.",
    },
    "498a": {
      ipc: "Section 498A IPC",
      bns: "Section 85 & 86 BNS",
      title: "Husband or relative subjecting woman to cruelty",
      penalty: "Imprisonment up to 3 years + fine",
      keyChange: "Separated into Section 85 (Cruelty by husband/relative) and Section 86 (Clear statutory definition of mental & physical cruelty).",
    },
    "124a": {
      ipc: "Section 124A IPC (Sedition)",
      bns: "Section 152 BNS (Endangering sovereignty)",
      title: "Acts endangering sovereignty, unity and integrity of India",
      penalty: "Imprisonment for life, or up to 7 years + fine",
      keyChange: "Colonial term 'Sedition' repealed; re-framed as acts threatening unity, integrity, and sovereignty of Bharat.",
    },
    "376": {
      ipc: "Section 376 IPC",
      bns: "Section 64 BNS",
      title: "Punishment for Rape",
      penalty: "Rigorous imprisonment not less than 10 years up to life + fine",
      keyChange: "Section 69 introduced for deceitful promise of marriage; Section 70 for gang rape with minimum 20 years.",
    },
    "506": {
      ipc: "Section 506 IPC",
      bns: "Section 351 BNS",
      title: "Punishment for Criminal Intimidation",
      penalty: "Imprisonment up to 2 years, or fine, or both",
      keyChange: "Expanded electronic communication and cyber threats covered under threat definitions.",
    },
  };

  const cleanKey = searchTerm.toLowerCase().replace(/[^a-z0-9]/g, "");
  const currentStatute = bnsDatabase[cleanKey] || bnsDatabase["420"];

  return (
    <section id="demo" className="scroll-mt-24 px-6 md:px-12 lg:px-24 py-20 border-t border-border bg-[#f8f6f0]/60">
      <div className="mx-auto w-full max-w-5xl">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.2em] uppercase">
            Interactive Product Tour
          </p>
          <h2 className="mt-3 font-serif text-3xl sm:text-4xl leading-tight">
            See how it decodes Indian law in seconds.
          </h2>
          <p className="text-muted-foreground mt-3 text-base">
            Click through real scenarios below to see NyayAI’s grounded procedural engine in action.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          <button
            onClick={() => setActiveTab("dossier")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-mono transition-all ${
              activeTab === "dossier"
                ? "bg-foreground text-background font-semibold shadow-sm"
                : "bg-white border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
            }`}
          >
            <Building2 className="size-3.5" />
            01. eCourts Case Dossier
          </button>
          <button
            onClick={() => setActiveTab("risk")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-mono transition-all ${
              activeTab === "risk"
                ? "bg-foreground text-background font-semibold shadow-sm"
                : "bg-white border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
            }`}
          >
            <ShieldAlert className="size-3.5" />
            02. Agreement Risk Radar
          </button>
          <button
            onClick={() => setActiveTab("converter")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-mono transition-all ${
              activeTab === "converter"
                ? "bg-foreground text-background font-semibold shadow-sm"
                : "bg-white border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
            }`}
          >
            <Scale className="size-3.5" />
            03. BNS ↔ IPC Converter
          </button>
          <button
            onClick={() => setActiveTab("assistant")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-mono transition-all ${
              activeTab === "assistant"
                ? "bg-foreground text-background font-semibold shadow-sm"
                : "bg-white border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
            }`}
          >
            <Sparkles className="size-3.5" />
            04. Plain-Language Assistant
          </button>
        </div>

        {/* Tab Content Canvas */}
        <div className="card !p-0 overflow-hidden shadow-sm bg-white border border-border">
          {/* Top Bar of Sandbox */}
          <div className="bg-[#fcfbf9] px-5 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-red-400" />
              <span className="size-2.5 rounded-full bg-amber-400" />
              <span className="size-2.5 rounded-full bg-emerald-400" />
              <span className="ml-3 font-mono text-[11px] text-muted-foreground truncate">
                {activeTab === "dossier" && "eCourts Services NJDG · CNR DLHC010048212024"}
                {activeTab === "risk" && "Clause Analyzer · Commercial_Lease_Draft_v2.pdf"}
                {activeTab === "converter" && "Statutory Cross-Reference · Bharatiya Nyaya Sanhita (2023)"}
                {activeTab === "assistant" && "NyayAI Procedural Grounding Engine · Active Session"}
              </span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
              Live Verified
            </span>
          </div>

          {/* TAB 1: Case Dossier */}
          {activeTab === "dossier" && (
            <div className="p-6 sm:p-8">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-border">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-muted-foreground uppercase">CNR:</span>
                    <code className="font-mono text-sm font-bold text-foreground bg-paper-warm px-2 py-0.5 rounded border border-border">
                      DLHC010048212024
                    </code>
                    <span className="bg-amber-100 text-amber-900 border border-amber-300 font-mono text-[10px] px-2 py-0.5 rounded-full font-medium">
                      Stage: Final Arguments
                    </span>
                  </div>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold mt-2 text-foreground">
                    Sharma vs. Apex Realty Infrastructure Pvt Ltd
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                    <span><Building2 className="inline size-3.5 mr-1" />Delhi High Court</span>
                    <span><MapPin className="inline size-3.5 mr-1" />Court Room 14, Single Bench</span>
                  </p>
                </div>
                <div className="bg-[#fbfaf7] p-3.5 rounded-lg border border-border text-left md:text-right shrink-0">
                  <span className="font-mono text-[10px] text-muted-foreground uppercase block">Next Listing</span>
                  <span className="font-serif text-lg font-bold text-foreground flex items-center md:justify-end gap-1.5 mt-0.5">
                    <Clock className="size-4 text-emerald-600" /> 14 Oct 2026
                  </span>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">Item No. 24 · Supplementary List</span>
                </div>
              </div>

              {/* Procedural Pathway Timeline */}
              <div className="mt-6">
                <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground block mb-3">
                  Procedural Chronology & Next Steps
                </span>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-md border border-border/80 bg-white">
                    <div className="flex items-center gap-1.5 text-emerald-700 font-mono text-xs font-semibold">
                      <CheckCircle2 className="size-3.5" /> 1. Written Statement
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Filed under CPC Order VIII Rule 1. Defendant admitted tenant deposit receipt.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-md border border-border/80 bg-white">
                    <div className="flex items-center gap-1.5 text-emerald-700 font-mono text-xs font-semibold">
                      <CheckCircle2 className="size-3.5" /> 2. Admission / Denial
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Electronic bank transfer logs exhibited as Ex. PW-1/2 under Section 65B BSA.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-md border-2 border-foreground/80 bg-foreground/5">
                    <div className="flex items-center gap-1.5 text-foreground font-mono text-xs font-bold">
                      <Clock className="size-3.5" /> 3. Final Arguments
                    </div>
                    <p className="text-xs text-foreground/80 mt-1.5 font-medium">
                      Listing scheduled for 14 Oct. Brief checklist and case laws prepared.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-border flex flex-wrap items-center justify-between gap-4">
                <p className="font-mono text-xs text-muted-foreground">
                  Updated directly from eCourts NJDG API · No manual portal refresh needed
                </p>
                <Link href="/app" className="btn-solid text-xs py-2 px-4 rounded-md">
                  Track Your Case by CNR <ArrowRight className="size-3.5 ml-1 inline" />
                </Link>
              </div>
            </div>
          )}

          {/* TAB 2: Risk Radar */}
          {activeTab === "risk" && (
            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
                <div>
                  <h3 className="font-serif text-xl font-bold text-foreground">
                    Rental Agreement Risk Scan
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    12 clauses extracted · 2 predatory covenants flagged with statutory defense grounds
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded bg-red-100 text-red-900 border border-red-200 font-mono text-xs font-bold">
                    1 High Risk
                  </span>
                  <span className="px-2.5 py-1 rounded bg-amber-100 text-amber-900 border border-amber-200 font-mono text-xs font-bold">
                    1 Moderate Risk
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {/* Flag 1 */}
                <div className="p-4 rounded-lg border border-red-200 bg-red-50/40">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="size-4 text-red-600 shrink-0" />
                        <span className="font-mono text-xs font-bold text-red-900 uppercase">
                          Clause 14.2 · Unilateral 24-Hour Eviction Notice
                        </span>
                      </div>
                      <p className="text-xs text-foreground/90 mt-2 font-mono bg-white p-2 rounded border border-red-200">
                        &quot;Lessor reserves the absolute right to forfeit security deposit and require immediate vacation within 24 hours without assigning cause.&quot;
                      </p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                        <span className="bg-red-200/70 text-red-950 font-mono text-[10px] px-2 py-0.5 rounded font-semibold">
                          Statutory Defense: Section 106, Transfer of Property Act 1882
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          Mandates minimum 15 days notice for monthly residential tenancies. Clause is void.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Flag 2 */}
                <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/40">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                        <span className="font-mono text-xs font-bold text-amber-900 uppercase">
                          Clause 9.1 · Complete Forfeiture of Security Deposit
                        </span>
                      </div>
                      <p className="text-xs text-foreground/90 mt-2 font-mono bg-white p-2 rounded border border-amber-200">
                        &quot;Any delay exceeding 3 days in monthly fee shall result in automatic full forfeiture of 3-month security deposit.&quot;
                      </p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                        <span className="bg-amber-200/70 text-amber-950 font-mono text-[10px] px-2 py-0.5 rounded font-semibold">
                          Statutory Defense: Section 74, Indian Contract Act 1872
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          Penal stipulation unenforceable; only actual damages suffered can be claimed.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-border flex flex-wrap items-center justify-between gap-4">
                <p className="font-mono text-xs text-muted-foreground">
                  PII Scrubbing: All phone numbers and Aadhaar numbers masked prior to scan.
                </p>
                <Link href="/app" className="btn-solid text-xs py-2 px-4 rounded-md">
                  Upload Contract to Scan <ArrowRight className="size-3.5 ml-1 inline" />
                </Link>
              </div>
            </div>
          )}

          {/* TAB 3: BNS Converter */}
          {activeTab === "converter" && (
            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
                <div>
                  <h3 className="font-serif text-xl font-bold text-foreground">
                    BNS ↔ IPC Statutory Cross-Reference
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Live lookup across Indian Penal Code (1860) and Bharatiya Nyaya Sanhita (2023)
                  </p>
                </div>
              </div>

              {/* Live Search & Quick Preset Buttons */}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground mr-1">Select Statute:</span>
                {[
                  { key: "420", label: "420 (Cheating)" },
                  { key: "379", label: "379 (Theft)" },
                  { key: "302", label: "302 (Murder)" },
                  { key: "498a", label: "498A (Cruelty)" },
                  { key: "124a", label: "124A (Sedition)" },
                  { key: "506", label: "506 (Threats)" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSearchTerm(key)}
                    className={`px-3 py-1 rounded text-xs font-mono transition-all ${
                      cleanKey === key
                        ? "bg-foreground text-background font-semibold"
                        : "bg-paper-warm text-foreground border border-border hover:border-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Comparison Card */}
              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-border bg-[#faf9f6]">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Legacy Indian Penal Code (1860)
                  </span>
                  <div className="font-serif text-2xl font-bold text-foreground mt-1 line-through decoration-muted-foreground/50">
                    {currentStatute.ipc}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 font-medium">
                    {currentStatute.title}
                  </p>
                </div>

                <div className="p-4 rounded-lg border-2 border-foreground bg-emerald-50/20">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-800 font-semibold">
                    New Bharatiya Nyaya Sanhita (2023)
                  </span>
                  <div className="font-serif text-2xl font-bold text-foreground mt-1">
                    {currentStatute.bns}
                  </div>
                  <p className="text-xs text-foreground/90 mt-2 font-medium">
                    {currentStatute.penalty}
                  </p>
                </div>
              </div>

              <div className="mt-4 p-3.5 rounded bg-paper-warm border border-border/80 text-xs">
                <span className="font-mono font-bold text-foreground">Statutory Nuance & Procedural Difference: </span>
                <span className="text-muted-foreground">{currentStatute.keyChange}</span>
              </div>

              <div className="mt-6 pt-5 border-t border-border flex flex-wrap items-center justify-between gap-4">
                <p className="font-mono text-xs text-muted-foreground">
                  Cross-referenced against official Gazette of India (Acts No. 45, 46, and 47 of 2023).
                </p>
                <Link href="/app" className="btn-solid text-xs py-2 px-4 rounded-md">
                  Compare Any Section <ArrowRight className="size-3.5 ml-1 inline" />
                </Link>
              </div>
            </div>
          )}

          {/* TAB 4: Plain Language Assistant */}
          {activeTab === "assistant" && (
            <div className="p-6 sm:p-8">
              <div className="space-y-4">
                {/* User message */}
                <div className="flex items-start gap-3 max-w-xl">
                  <div className="size-7 rounded-full bg-paper-warm border border-border font-mono text-xs flex items-center justify-center font-bold text-foreground shrink-0">
                    U
                  </div>
                  <div className="bg-[#f5f2ea] p-3.5 rounded-2xl rounded-tl-sm text-sm text-foreground">
                    &quot;Mera landlord keh raha hai ki 24 hours mein room khali karo warna luggage bahar phek dega aur deposit nahi dega. What are my legal protections?&quot;
                  </div>
                </div>

                {/* NyayAI message */}
                <div className="flex items-start gap-3 max-w-2xl ml-auto">
                  <div className="bg-foreground text-background p-4 rounded-2xl rounded-tr-sm text-sm shadow-sm space-y-3">
                    <p className="font-medium text-white/95">
                      Your landlord cannot evict you in 24 hours or arbitrarily forfeit your deposit. Under Indian law:
                    </p>
                    <ul className="space-y-2 text-xs text-white/85">
                      <li className="flex items-start gap-2">
                        <span className="font-mono font-bold text-amber-300">1. Mandatory Notice:</span>
                        <span>Under <strong>Section 106 of the Transfer of Property Act, 1882</strong>, eviction requires a minimum 15-day formal written notice for monthly tenancies.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-mono font-bold text-amber-300">2. Illegal Dispossession:</span>
                        <span>Throwing your belongings out without a court decree is punishable under <strong>Section 329 BNS (Criminal Trespass)</strong> and <strong>Section 351 BNS (Criminal Intimidation)</strong>.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-mono font-bold text-amber-300">3. Immediate Action:</span>
                        <span>You can file an urgent application before the local Rent Authority or Sub-Divisional Magistrate for protection against unlawful dispossession.</span>
                      </li>
                    </ul>
                    <div className="pt-2 border-t border-white/15 flex items-center justify-between text-[10px] font-mono text-white/60">
                      <span>GROUNDED CITATION · ACT NO. 4 OF 1882</span>
                      <span className="text-emerald-300">● 100% STATUTORY MATCH</span>
                    </div>
                  </div>
                  <div className="size-7 rounded-full bg-foreground text-background font-mono text-xs flex items-center justify-center font-bold shrink-0">
                    N
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-border flex flex-wrap items-center justify-between gap-4">
                <p className="font-mono text-xs text-muted-foreground">
                  Ask in Hindi, English, or Hinglish · No legal jargon required
                </p>
                <Link href="/app" className="btn-solid text-xs py-2 px-4 rounded-md">
                  Ask Your Question in NyayAI <ArrowRight className="size-3.5 ml-1 inline" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
