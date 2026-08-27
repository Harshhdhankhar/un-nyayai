import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";
import { WorkspaceConsole } from "@/components/app/tool-launcher";
import { listMatters } from "@/lib/matters/service";
import {
  ArrowRight,
  BookOpen,
  Clock,
  FileText,
  Landmark,
  Plus,
  Scale,
  ShieldCheck,
} from "lucide-react";

const STATUTE_CHIPS = [
  { section: "Sec 138 NI Act", label: "Cheque Dishonour · 15-Day Notice Limit", href: "/app/assistant?q=Section+138+Negotiable+Instruments+Act+limitation+and+reply+procedure" },
  { section: "Sec 106 TPA", label: "Tenancy Notice · 15-Day Minimum Period", href: "/app/assistant?q=Section+106+Transfer+of+Property+Act+minimum+notice+period" },
  { section: "Sec 318 BNS", label: "Cheating & Criminal Breach (Old 420 IPC)", href: "/app/assistant?q=Section+318+Bharatiya+Nyaya+Sanhita+cheating+provisions" },
  { section: "Order 39 CPC", label: "Temporary Injunction & Status Quo", href: "/app/assistant?q=Order+39+Rule+1+and+2+CPC+temporary+injunction+grounds" },
  { section: "Sec 27 ICA", label: "Restraint of Trade / Employment Bonds", href: "/app/assistant?q=Section+27+Indian+Contract+Act+employment+bond+enforceability" },
];

export default async function AppHomePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [matters, recentDocs] = await Promise.all([
    listMatters(user.id),
    db
      .select()
      .from(documents)
      .where(eq(documents.userId, user.id))
      .orderBy(desc(documents.createdAt))
      .limit(3),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12 space-y-10">
      {/* ── 1. Hero & Primary Action Input ── */}
      <section className="space-y-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-xs shadow-2xs">
            <span className="size-2 rounded-full bg-verified-700 animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
              LEGAL NAVIGATION WORKSPACE
            </span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-foreground font-normal tracking-tight leading-[1.12]">
            What do you need to figure out?
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
            Describe your situation, notice, or dispute in plain words. Grounded in official Indian law with citations you can verify.
          </p>
        </div>

        {/* Large Natural-Language Search & Ask Bar (No duplicate feature tabs) */}
        <WorkspaceConsole />
      </section>

      {/* ── 2. Dashboard Content: User Data & Quick Reference ── */}
      <div className="grid gap-8 md:grid-cols-12">
        {/* Left Column (7 cols): Active Matters & Recent Documents */}
        <div className="space-y-8 md:col-span-7">
          {/* Active Matters Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Landmark className="size-4 text-muted-foreground" />
                <h2 className="font-serif text-lg sm:text-xl font-semibold text-foreground">
                  Your Case Matters & Dossiers
                </h2>
              </div>
              <Link
                href="/app/matters/new"
                className="btn-solid text-xs py-1.5 px-3 rounded-md font-medium inline-flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                <span>New Matter</span>
              </Link>
            </div>

            {matters.length > 0 ? (
              <div className="space-y-3">
                {matters.map((matter) => (
                  <Link
                    key={matter.id}
                    href={`/app/matters/${matter.id}`}
                    className="card group block p-4 transition-all hover:border-foreground"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="size-1.5 rounded-full bg-verified-700 shrink-0" />
                          <h3 className="font-semibold text-foreground group-hover:underline text-sm">
                            {matter.title}
                          </h3>
                        </div>
                        <p className="font-mono text-[11px] text-muted-foreground pl-3.5">
                          {matter.matterType.toUpperCase()} {matter.cnr ? `· CNR: ${matter.cnr}` : ""}
                        </p>
                      </div>

                      <span className="rounded bg-paper-warm border border-border px-2 py-0.5 font-mono text-[10px] font-semibold text-foreground">
                        {matter.status}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-2.5 text-[11px] text-muted-foreground pl-3.5 font-mono">
                      <span>Open complete docket</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-white/70 p-6 text-center space-y-3">
                <Scale className="size-7 text-muted-foreground/50 mx-auto" />
                <div>
                  <p className="text-sm font-medium text-foreground">No active case dossiers yet</p>
                  <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                    Create a matter or start with any inquiry to organize your case timeline, evidence, and orders.
                  </p>
                </div>
                <div className="pt-1 flex justify-center">
                  <Link href="/app/matters/new" className="btn-solid text-xs py-1.5 px-3 rounded-md">
                    Create First Matter
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Recent Analyzed Documents (if any exist) */}
          {recentDocs.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-muted-foreground" />
                  <h3 className="font-serif text-base font-semibold text-foreground">
                    Recent Analyzed Documents
                  </h3>
                </div>
                <Link
                  href="/app/documents"
                  className="text-xs text-muted-foreground hover:text-foreground font-mono transition-colors"
                >
                  View all →
                </Link>
              </div>

              <div className="space-y-2.5">
                {recentDocs.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/app/documents/${doc.id}`}
                    className="card group flex items-center justify-between p-3 transition-all hover:border-foreground text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="size-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-foreground truncate group-hover:underline">
                        {doc.name}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground shrink-0 uppercase bg-paper-warm px-2 py-0.5 rounded border border-border">
                      {doc.kind || "document"}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (5 cols): Statutory Reference & Limitation Windows */}
        <div className="space-y-6 md:col-span-5">
          {/* Statutory Reference */}
          <div className="rounded-xl border border-border bg-white p-5 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-border/70 pb-3">
              <BookOpen className="size-4 text-muted-foreground" />
              <h3 className="font-serif text-base font-semibold text-foreground">
                Statutory Quick Reference
              </h3>
            </div>
            <div className="space-y-2">
              {STATUTE_CHIPS.map((chip) => (
                <Link
                  key={chip.section}
                  href={chip.href}
                  className="group block rounded-lg border border-border/70 bg-[#faf9f6] p-2.5 text-xs transition-colors hover:border-foreground hover:bg-[#f5f2ea]"
                >
                  <span className="font-mono font-bold text-foreground text-[11px] block group-hover:underline">
                    {chip.section}
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    {chip.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Statutory Limitation Windows */}
          <div className="rounded-xl border border-border bg-white p-5 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-border/70 pb-3">
              <Clock className="size-4 text-muted-foreground" />
              <h3 className="font-serif text-base font-semibold text-foreground">
                Statutory Limitation Windows
              </h3>
            </div>
            <ul className="space-y-2.5 text-xs text-muted-foreground">
              <li className="flex items-start justify-between gap-2">
                <span>138 NI Act Cheque Reply</span>
                <span className="font-mono font-bold text-foreground">15 Days</span>
              </li>
              <li className="flex items-start justify-between gap-2">
                <span>Section 106 Tenancy Notice</span>
                <span className="font-mono font-bold text-foreground">15 Days</span>
              </li>
              <li className="flex items-start justify-between gap-2">
                <span>Consumer Forum Written Version</span>
                <span className="font-mono font-bold text-foreground">30 Days</span>
              </li>
              <li className="flex items-start justify-between gap-2">
                <span>Civil First Appeal (High Court)</span>
                <span className="font-mono font-bold text-foreground">90 Days</span>
              </li>
            </ul>
          </div>

          {/* Privacy & Provenance Guarantee */}
          <div className="rounded-xl border border-verified-200/80 bg-verified-100/40 p-4 text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-verified-900 font-semibold">
              <ShieldCheck className="size-4 text-verified-700" />
              <span>Grounded Legal Intelligence</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              All outputs cite exact statutory provisions (BNS, CPC, TPA, ICA) and official court registries. Sensitive identifiers (Aadhaar, PAN) are masked client-side.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
