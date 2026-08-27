import Link from "next/link";
import { CheckCircle2, ExternalLink, FileText, Landmark, Scale, ScrollText } from "lucide-react";

export function SourcesSection() {
  return (
    <section id="sources" className="scroll-mt-24 border-t border-ink-200/80 px-6 py-24 sm:py-32 md:px-12 lg:px-24">
      <div className="mx-auto w-full max-w-5xl">
        <div className="grid gap-10 md:grid-cols-12 md:gap-14">
          <div className="md:col-span-5">
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink-500 font-semibold">
              Source-First Verification
            </p>
            <h2 className="mt-5 font-serif text-3xl sm:text-4xl md:text-5xl font-semibold leading-[1.08] text-ink-950">
              DON’T JUST
              <br />
              TRUST THE ANSWER.
              <br />
              <span className="text-ink-400 font-serif italic font-normal">VERIFY IT.</span>
            </h2>
            <p className="mt-6 text-base leading-relaxed text-ink-600">
              In legal technology, ungrounded speculation is worse than silence. Every assertion NyayAI makes is linked to an official statutory section, a court order, or a verified precedent.
            </p>
            <div className="mt-8">
              <Link href="/app/assistant" className="btn-outline text-xs">
                <span>Test Citation Verification</span>
                <span aria-hidden="true" className="font-mono">→</span>
              </Link>
            </div>
          </div>

          <div className="space-y-4 md:col-span-7 md:col-start-6">
            {/* Source Card 1 */}
            <div className="card border-l-4 border-l-verified-700 p-5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-verified-800 flex items-center gap-1.5">
                  <Landmark className="h-4 w-4 text-verified-700" />
                  OFFICIAL ECOURTS RECORD
                </span>
                <span className="font-mono text-[11px] text-ink-500">Live Registry</span>
              </div>
              <h3 className="font-serif text-lg font-semibold text-ink-950">
                Saket District Court · CS SCJ 412/2024
              </h3>
              <p className="text-xs text-ink-600 leading-relaxed">
                Direct synchronization with official eCourts registry records. Next hearing date, current bench, and interim orders verified directly by CNR.
              </p>
              <div className="pt-2 border-t border-ink-150 flex items-center justify-between text-[11px] font-mono text-ink-500">
                <span>CNR: DLST01-004821-2024</span>
                <span className="text-ink-800 font-semibold underline">View Court Dossier →</span>
              </div>
            </div>

            {/* Source Card 2 */}
            <div className="card border-l-4 border-l-navy-700 p-5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-navy-800 flex items-center gap-1.5">
                  <ScrollText className="h-4 w-4 text-navy-700" />
                  STATUTORY ACTS & SANHITAS
                </span>
                <span className="font-mono text-[11px] text-ink-500">Govt of India Gazette</span>
              </div>
              <h3 className="font-serif text-lg font-semibold text-ink-950">
                Bharatiya Nyaya Sanhita, 2023 · Sec 316 (Criminal Breach of Trust)
              </h3>
              <p className="text-xs text-ink-600 leading-relaxed">
                Cross-referenced with legacy IPC Section 406 mapping so advocates and citizens understand both applicable frameworks.
              </p>
              <div className="pt-2 border-t border-ink-150 flex items-center justify-between text-[11px] font-mono text-ink-500">
                <span>BNS Act No. 45 of 2023</span>
                <span className="text-ink-800 font-semibold underline">Inspect Section Text →</span>
              </div>
            </div>

            {/* Source Card 3 */}
            <div className="card border-l-4 border-l-rust-600 p-5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-rust-700 flex items-center gap-1.5">
                  <Scale className="h-4 w-4 text-rust-600" />
                  APEX COURT PRECEDENT
                </span>
                <span className="font-mono text-[11px] text-ink-500">Supreme Court of India</span>
              </div>
              <h3 className="font-serif text-lg font-semibold text-ink-950">
                N. Parameswaran Unni v. G. Kannan & Anr. (2017) 5 SCC 737
              </h3>
              <p className="text-xs text-ink-600 leading-relaxed">
                Settled jurisprudence on notice delivery presumption under Section 27 of General Clauses Act for dishonoured cheques.
              </p>
              <div className="pt-2 border-t border-ink-150 flex items-center justify-between text-[11px] font-mono text-ink-500">
                <span>Citation: 2017 INSC 312</span>
                <span className="text-ink-800 font-semibold underline">Read Judgment Extract →</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
