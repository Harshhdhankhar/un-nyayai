import Link from "next/link";
import { Check, X } from "lucide-react";

export function ComparisonSection() {
  const rows = [
    {
      feature: "BNS / BNSS / BSA (2023) Grounding",
      generic: "Confuses old IPC/CrPC with new BNS laws or hallucinates section numbers",
      nyayai: "100% deterministic cross-referencing against official 2023 Gazettes",
    },
    {
      feature: "Real-time eCourts & CNR Integration",
      generic: "Zero court awareness; cannot read live NJDG cause lists or order sheets",
      nyayai: "Reads CNR directly from eCourts with next hearing stage, court room & bench",
    },
    {
      feature: "Client-Side PII Masking",
      generic: "Aadhaar, PAN, and sensitive dispute records sent unmasked to cloud models",
      nyayai: "Automatic local regex masking before any text is processed",
    },
    {
      feature: "Rental & Contract Defense Rules",
      generic: "Gives vague summary without citing relevant clauses or Indian Contract Act",
      nyayai: "Extracts clauses and flags unlawful covenants with exact statutory defense",
    },
    {
      feature: "Language & Terminology",
      generic: "Requires formal legal English queries to give sensible procedural answers",
      nyayai: "Understands Hindi, Hinglish, and plain conversational descriptions",
    },
  ];

  return (
    <section className="scroll-mt-24 px-6 md:px-12 lg:px-24 py-24 sm:py-32 border-t border-border">
      <div className="mx-auto w-full max-w-5xl">
        <div className="max-w-2xl">
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.2em] uppercase">
            Why It Matters
          </p>
          <h2 className="mt-5 font-serif text-3xl leading-tight sm:text-4xl">
            Why generic AI fails at Indian law.
          </h2>
          <p className="text-muted-foreground mt-4 text-base leading-relaxed">
            Legal procedures have zero tolerance for hallucinations. When a wrong section can get a petition dismissed, grounding is everything.
          </p>
        </div>

        <div className="mt-12 overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse border border-border">
            <thead>
              <tr className="bg-[#f8f6f0] border-b border-border">
                <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground w-1/3">
                  Capability
                </th>
                <th className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground w-1/3 border-l border-border">
                  Generic AI (ChatGPT / Claude)
                </th>
                <th className="p-4 font-mono text-xs uppercase tracking-wider text-foreground w-1/3 border-l border-border bg-foreground/5 font-bold">
                  NyayAI Engine
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-white">
              {rows.map((r, idx) => (
                <tr key={idx} className="hover:bg-[#fcfbf8] transition-colors">
                  <td className="p-4 font-serif font-semibold text-foreground">
                    {r.feature}
                  </td>
                  <td className="p-4 text-muted-foreground border-l border-border">
                    <div className="flex items-start gap-2">
                      <X className="size-4 text-red-500 shrink-0 mt-0.5" />
                      <span>{r.generic}</span>
                    </div>
                  </td>
                  <td className="p-4 text-foreground border-l border-border bg-foreground/[0.02] font-medium">
                    <div className="flex items-start gap-2">
                      <Check className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{r.nyayai}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-10 flex items-center justify-between flex-wrap gap-4 pt-6 border-t border-border">
          <p className="font-mono text-xs text-muted-foreground">
            Free forever. Built on open public data and official registries.
          </p>
          <Link href="/app" className="btn-solid text-sm py-2.5 px-6 rounded-md">
            Start With NyayAI Now
          </Link>
        </div>
      </div>
    </section>
  );
}
