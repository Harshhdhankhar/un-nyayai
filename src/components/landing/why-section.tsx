import Link from "next/link";
import { CheckCircle2, Shield, Scale, Database, Zap } from "lucide-react";

export function WhySection() {
  return (
    <section id="why" className="scroll-mt-24 border-t border-ink-200/80 bg-paper-warm/40 px-6 py-24 sm:py-32 md:px-12 lg:px-24">
      <div className="mx-auto w-full max-w-5xl">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink-500 font-semibold">
            Why NyayAI
          </p>
          <h2 className="mt-5 font-serif text-3xl sm:text-4xl md:text-5xl font-semibold leading-[1.08] text-ink-950">
            A SERIOUS LEGAL SYSTEM.
            <br />
            <span className="text-ink-400 font-serif italic font-normal">NOT A GENERIC</span> AI CHATBOT.
          </h2>
          <p className="mt-6 text-base leading-relaxed text-ink-600">
            NyayAI combines direct eCourts integrations, statutory databases (BNS, BSA, BNSS, CPC, CrPC), client-side document analyzers, and citation verification engines into a unified legal navigation workspace.
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-2">
          <div className="card space-y-3">
            <span className="font-mono text-xs text-verified-700 font-semibold">01 / PROVENANCE</span>
            <h3 className="font-serif text-2xl font-semibold text-ink-950">Every answer carries citations</h3>
            <p className="text-sm leading-relaxed text-ink-600">
              When NyayAI explains your rights or outlines a remedy, it cites the exact statutory section, court rule, or precedent. You can inspect the source directly instead of trusting a black box.
            </p>
          </div>

          <div className="card space-y-3">
            <span className="font-mono text-xs text-verified-700 font-semibold">02 / LIVE RECORDS</span>
            <h3 className="font-serif text-2xl font-semibold text-ink-950">Direct eCourts tracking</h3>
            <p className="text-sm leading-relaxed text-ink-600">
              Enter your 16-character CNR or search by party name to pull live hearing dates, pending orders, and official case history straight from the court registry.
            </p>
          </div>

          <div className="card space-y-3">
            <span className="font-mono text-xs text-verified-700 font-semibold">03 / DOCUMENT CLARITY</span>
            <h3 className="font-serif text-2xl font-semibold text-ink-950">Clause & risk extraction</h3>
            <p className="text-sm leading-relaxed text-ink-600">
              Upload rent agreements, employment contracts, notices or FIRs. NyayAI breaks down obligations, flags unbalanced termination clauses, and detects missing information.
            </p>
          </div>

          <div className="card space-y-3">
            <span className="font-mono text-xs text-verified-700 font-semibold">04 / ZERO HALLUCINATION</span>
            <h3 className="font-serif text-2xl font-semibold text-ink-950">Grounded Indian legal context</h3>
            <p className="text-sm leading-relaxed text-ink-600">
              Built specifically for India's transition to Bharatiya Nyaya Sanhita (BNS) alongside legacy IPC/CrPC frameworks, consumer forums (NCDRC), RERA, and state rent acts.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
