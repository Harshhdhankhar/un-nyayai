import Link from "next/link";
import { Building2, Search, Scale, ShieldAlert, ShieldCheck, MessageSquareText, ArrowRight } from "lucide-react";

export function FeaturesSection() {
  return (
    <section id="what" className="scroll-mt-24 px-6 md:px-12 lg:px-24 py-24 sm:py-32 border-t border-border bg-white">
      <div className="mx-auto w-full max-w-5xl">
        <div className="max-w-2xl">
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.2em] uppercase">
            Core Modules
          </p>
          <h2 className="mt-5 font-serif text-3xl leading-tight sm:text-4xl">
            Six specialized tools, done properly.
          </h2>
          <p className="text-muted-foreground mt-3 text-base leading-relaxed">
            Every feature is engineered for high accuracy, grounded in Indian statutes and live court registries.
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:gap-10 md:grid-cols-2">
          {/* Card 01 */}
          <div>
            <article className="card h-full flex flex-col justify-between hover:border-foreground/60 transition-all hover:shadow-sm">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground/60 font-mono text-xs tabular-nums">01 / DOSSIER</span>
                  <Building2 className="size-4 text-foreground/70" />
                </div>
                <h3 className="mt-4 font-serif text-2xl leading-tight">
                  Builds your live case dossier
                </h3>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  Reads directly from eCourts, High Courts and NJDG by CNR. Tracks hearing dates, stage, court rooms, and past order sheets without manual checking.
                </p>
                <div className="mt-4 p-2.5 rounded bg-[#f8f6f0] border border-border/80 flex items-center gap-2 text-xs font-mono">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span className="text-foreground font-semibold">CNR DLHC010048212024</span>
                  <span className="text-muted-foreground ml-auto">Next: 14 Oct</span>
                </div>
              </div>
              <p className="text-muted-foreground mt-5 border-t border-border pt-4 text-xs font-mono">
                No captcha loops · Verified eCourts cause lists
              </p>
            </article>
          </div>

          {/* Card 02 (staggered with md:mt-12) */}
          <div>
            <article className="card h-full md:mt-12 flex flex-col justify-between hover:border-foreground/60 transition-all hover:shadow-sm">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground/60 font-mono text-xs tabular-nums">02 / SEARCH</span>
                  <Search className="size-4 text-foreground/70" />
                </div>
                <h3 className="mt-4 font-serif text-2xl leading-tight">
                  Search by party name or court
                </h3>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  Search across 25 High Courts and 680+ District Courts by petitioner or respondent name, establishment code, and filing year without needing the CNR upfront.
                </p>
                <div className="mt-4 p-2.5 rounded bg-[#f8f6f0] border border-border/80 flex items-center gap-2 text-xs font-mono">
                  <span className="text-muted-foreground">Query:</span>
                  <span className="text-foreground font-semibold">&quot;Apex Realty&quot; · DLHC</span>
                  <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded text-[10px] ml-auto">4 Matches</span>
                </div>
              </div>
              <p className="text-muted-foreground mt-5 border-t border-border pt-4 text-xs font-mono">
                Direct CNR resolution · Provenance tracking
              </p>
            </article>
          </div>

          {/* Card 03 */}
          <div>
            <article className="card h-full flex flex-col justify-between hover:border-foreground/60 transition-all hover:shadow-sm">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground/60 font-mono text-xs tabular-nums">03 / CITATIONS</span>
                  <Scale className="size-4 text-foreground/70" />
                </div>
                <h3 className="mt-4 font-serif text-2xl leading-tight">
                  100% statutory section grounding
                </h3>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  Every guidance cites the exact BNS, BSA, BNSS, CPC, or NI Act section. No generative model is ever allowed to invent legal rules.
                </p>
                <div className="mt-4 p-2.5 rounded bg-[#f8f6f0] border border-border/80 flex flex-wrap gap-1.5 text-[11px] font-mono">
                  <span className="bg-white px-2 py-0.5 rounded border border-border">S. 318 BNS</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-border">S. 106 TPA</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-border">O. VIII R. 1 CPC</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-border">S. 138 NI Act</span>
                </div>
              </div>
              <p className="text-muted-foreground mt-5 border-t border-border pt-4 text-xs font-mono">
                Acts No. 45, 46, 47 of 2023 Gazette integration
              </p>
            </article>
          </div>

          {/* Card 04 (staggered with md:mt-12) */}
          <div>
            <article className="card h-full md:mt-12 flex flex-col justify-between hover:border-foreground/60 transition-all hover:shadow-sm">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground/60 font-mono text-xs tabular-nums">04 / RADAR</span>
                  <ShieldAlert className="size-4 text-foreground/70" />
                </div>
                <h3 className="mt-4 font-serif text-2xl leading-tight">
                  Flags contract risks you can defend
                </h3>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  Upload rent agreements, employment contracts or legal notices. Extracts clauses, highlights predatory covenants, and grades severity in plain English.
                </p>
                <div className="mt-4 p-2.5 rounded bg-[#f8f6f0] border border-border/80 flex items-center justify-between text-xs font-mono">
                  <span className="text-red-700 bg-red-100 px-2 py-0.5 rounded font-semibold text-[11px]">Unilateral Notice (High)</span>
                  <span className="text-muted-foreground text-[10px]">S. 23 Contract Act</span>
                </div>
              </div>
              <p className="text-muted-foreground mt-5 border-t border-border pt-4 text-xs font-mono">
                Clause extraction · Statutory defense basis
              </p>
            </article>
          </div>

          {/* Card 05 */}
          <div>
            <article className="card h-full flex flex-col justify-between hover:border-foreground/60 transition-all hover:shadow-sm">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground/60 font-mono text-xs tabular-nums">05 / PRIVACY</span>
                  <ShieldCheck className="size-4 text-foreground/70" />
                </div>
                <h3 className="mt-4 font-serif text-2xl leading-tight">
                  Automated client-side PII scrubbing
                </h3>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  Aadhaar numbers, PAN cards, phone numbers, and bank details are detected and masked before any document analysis executes.
                </p>
                <div className="mt-4 p-2.5 rounded bg-[#f8f6f0] border border-border/80 text-xs font-mono text-muted-foreground">
                  Aadhaar: <span className="bg-foreground text-background px-1.5 py-0.5 rounded font-bold">[REDACTED_AADHAAR]</span>
                </div>
              </div>
              <p className="text-muted-foreground mt-5 border-t border-border pt-4 text-xs font-mono">
                Zero retention · Strict tenant isolation
              </p>
            </article>
          </div>

          {/* Card 06 (staggered with md:mt-12) */}
          <div>
            <article className="card h-full md:mt-12 flex flex-col justify-between hover:border-foreground/60 transition-all hover:shadow-sm">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground/60 font-mono text-xs tabular-nums">06 / ASSISTANT</span>
                  <MessageSquareText className="size-4 text-foreground/70" />
                </div>
                <h3 className="mt-4 font-serif text-2xl leading-tight">
                  Multilingual conversational triage
                </h3>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  Ask questions in Hindi, Hinglish, or English. NyayAI converts ordinary language into actionable legal routes with statutory citations.
                </p>
                <div className="mt-4 p-2.5 rounded bg-[#f8f6f0] border border-border/80 text-xs font-mono text-foreground flex items-center gap-2">
                  <span className="text-muted-foreground text-[10px]">Lang:</span>
                  <span className="font-semibold">&quot;Deposit refund nahi mil raha&quot;</span>
                  <span className="text-emerald-700 font-bold ml-auto">→ S. 74 ICA</span>
                </div>
              </div>
              <p className="text-muted-foreground mt-5 border-t border-border pt-4 text-xs font-mono">
                Plain language → Procedural steps
              </p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
