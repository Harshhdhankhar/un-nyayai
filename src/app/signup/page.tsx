import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { ShieldCheck, Scale, ArrowLeft, UserCheck } from "lucide-react";

export default function SignupPage() {
  return (
    <main className="min-h-svh lg:h-svh bg-[#fbfaf7] flex flex-col justify-between p-4 sm:p-6 md:px-10 md:py-6 overflow-x-hidden selection:bg-border">
      {/* Top Bar */}
      <div className="mx-auto w-full max-w-4xl flex items-center justify-between z-10 shrink-0">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
          <span>Back to overview</span>
        </Link>

        <Link href="/" className="inline-block">
          <span className="font-mono text-base tracking-tight font-bold text-foreground">
            <span className="logo__struck mr-0.5">
              un
              <span className="logo__strike" aria-hidden="true" />
            </span>
            <span>nyayai</span>
            <span className="logo__caret ml-0.5 text-foreground">_</span>
          </span>
        </Link>
      </div>

      {/* Main Dual Card Canvas (Fits screen) */}
      <div className="mx-auto w-full max-w-4xl my-auto py-2 z-10">
        <div className="grid lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: Editorial Context Panel */}
          <div className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-7 rounded-2xl bg-[#f5f2ea] border border-border/80 relative overflow-hidden">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/80 border border-border/60 text-emerald-800 font-mono text-[10px] uppercase tracking-wider font-semibold">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Free Forever · Open Source
              </div>

              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mt-4 leading-tight">
                Built for citizens,
                <br />
                tenants & advocates.
              </h2>

              <p className="text-muted-foreground text-xs leading-relaxed mt-3">
                No credit cards. No retainers. Instant clarity on your legal notices, agreements, and hearings.
              </p>
            </div>

            <div className="mt-6 pt-5 border-t border-border/70 space-y-2.5 font-mono text-[11px] text-foreground/80">
              <div className="flex items-center gap-2">
                <UserCheck className="size-3.5 text-emerald-700 shrink-0" />
                <span>Instant workspace activation</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-3.5 text-foreground/70 shrink-0" />
                <span>Aadhaar & PAN auto-redacted</span>
              </div>
              <div className="flex items-center gap-2">
                <Scale className="size-3.5 text-amber-700 shrink-0" />
                <span>BNS 2023 Gazette grounded</span>
              </div>
            </div>
          </div>

          {/* Right: Signup Form Card */}
          <div className="lg:col-span-7 p-6 sm:p-7 rounded-2xl bg-white border border-border shadow-xs flex flex-col justify-center">
            <div className="mb-4">
              <h1 className="font-serif text-xl sm:text-2xl font-bold text-foreground">
                Create workspace account
              </h1>
              <p className="text-muted-foreground text-xs mt-0.5">
                Fill in your details to create your NyayAI account.
              </p>
            </div>

            <Suspense fallback={<p className="py-4 text-center text-xs text-muted-foreground font-mono">Loading form…</p>}>
              <AuthForm mode="signup" />
            </Suspense>

            <p className="mt-4 text-center text-xs text-muted-foreground font-sans">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-foreground underline underline-offset-2 hover:opacity-80">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer Disclaimer */}
      <div className="mx-auto w-full max-w-4xl text-center text-[10px] font-mono text-muted-foreground/70 z-10 shrink-0">
        NyayAI · Open-source transparent Indian legal navigation · Not formal legal advice
      </div>
    </main>
  );
}
