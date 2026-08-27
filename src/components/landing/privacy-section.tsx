"use client";

import { useState } from "react";
import { Shield, Eye, EyeOff, Lock, ServerOff, DatabaseZap } from "lucide-react";

export function PrivacySection() {
  const [redacted, setRedacted] = useState(true);

  return (
    <section id="sources" className="scroll-mt-24 px-6 md:px-12 lg:px-24 py-24 sm:py-32 border-t border-border bg-[#f8f6f0]/50">
      <div className="mx-auto w-full max-w-5xl">
        <div className="max-w-2xl">
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.2em] uppercase">
            Client-Side Privacy Architecture
          </p>
          <h2 className="mt-5 font-serif text-3xl sm:text-5xl leading-tight text-balance">
            Your legal records never leave your control.
          </h2>
          <p className="text-muted-foreground mt-4 text-base leading-relaxed">
            No data brokers. No training public AI models on your private agreements. We built client-side redaction directly into the browser.
          </p>
        </div>

        {/* Live Interactive PII Redaction Simulator */}
        <div className="mt-12 card !p-0 overflow-hidden bg-white border border-border">
          <div className="bg-[#181d24] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-mono text-xs">
              <Shield className="size-4 text-emerald-400" />
              <span className="font-semibold text-white/90">Client-Side PII Masking Engine</span>
            </div>
            <button
              onClick={() => setRedacted(!redacted)}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-xs font-mono transition-colors text-white"
            >
              {redacted ? <EyeOff className="size-3.5 text-emerald-400" /> : <Eye className="size-3.5 text-amber-400" />}
              <span>{redacted ? "Redaction: ACTIVE (Click to toggle)" : "Redaction: DISABLED (Raw PII)"}</span>
            </button>
          </div>

          <div className="p-6 sm:p-8 font-mono text-xs leading-relaxed text-foreground/90 space-y-4 bg-[#fcfbf9]">
            <div className="p-4 rounded-md border border-border/80 bg-white">
              <p className="text-muted-foreground text-[11px] uppercase mb-2">Sample Agreement Document Extract:</p>
              <p>
                &ldquo;This Lease Agreement is executed by Tenant{" "}
                <span className="font-bold text-foreground">Rajesh Kumar</span>, resident of Sector 62, Noida, bearing Aadhaar No.{" "}
                {redacted ? (
                  <span className="bg-foreground text-background px-1.5 py-0.5 rounded font-bold text-[11px]">
                    [REDACTED_AADHAAR_XXXX]
                  </span>
                ) : (
                  <span className="bg-red-100 text-red-900 px-1.5 py-0.5 rounded font-bold">
                    4821 9920 1823
                  </span>
                )}
                {" "}and PAN Card No.{" "}
                {redacted ? (
                  <span className="bg-foreground text-background px-1.5 py-0.5 rounded font-bold text-[11px]">
                    [REDACTED_PAN_XXXX]
                  </span>
                ) : (
                  <span className="bg-red-100 text-red-900 px-1.5 py-0.5 rounded font-bold">
                    ABCDE1234F
                  </span>
                )}
                . Security deposit transfer of ₹75,000 sent to HDFC Bank A/C{" "}
                {redacted ? (
                  <span className="bg-foreground text-background px-1.5 py-0.5 rounded font-bold text-[11px]">
                    [REDACTED_BANK_XXXX]
                  </span>
                ) : (
                  <span className="bg-red-100 text-red-900 px-1.5 py-0.5 rounded font-bold">
                    50100293847192
                  </span>
                )}
                .&rdquo;
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5 text-emerald-800">
                <span className="size-2 rounded-full bg-emerald-500" />
                Regex patterns run locally in your browser memory before API transmission
              </span>
              <span className="font-mono">Zero retention policy</span>
            </div>
          </div>
        </div>

        {/* 3 Architecture Pillars */}
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          <div className="card bg-white p-5">
            <div className="size-8 rounded-md bg-[#f5f2ea] flex items-center justify-center mb-3">
              <Lock className="size-4 text-foreground" />
            </div>
            <h3 className="font-serif text-lg font-bold">Session Isolation</h3>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              Your uploaded agreements and CNR queries are stored strictly within your private workspace session.
            </p>
          </div>

          <div className="card bg-white p-5">
            <div className="size-8 rounded-md bg-[#f5f2ea] flex items-center justify-center mb-3">
              <ServerOff className="size-4 text-foreground" />
            </div>
            <h3 className="font-serif text-lg font-bold">No Public Model Training</h3>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              Dispute records, tenant notices, and case files are never fed back into public generative training sets.
            </p>
          </div>

          <div className="card bg-white p-5">
            <div className="size-8 rounded-md bg-[#f5f2ea] flex items-center justify-center mb-3">
              <DatabaseZap className="size-4 text-foreground" />
            </div>
            <h3 className="font-serif text-lg font-bold">Direct Official Registries</h3>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              Queries connect directly to official eCourts NJDG endpoints, exactly as if you looked up a cause list yourself.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
