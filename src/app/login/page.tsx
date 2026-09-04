import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { ShieldCheck, Scale, Building2, ArrowLeft } from "lucide-react";

export default function LoginPage() {
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
                Live Indian Law Engine
              </div>

              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mt-4 leading-tight">
                One login.
                <br />
                All Indian law decoded.
              </h2>

              <p className="text-muted-foreground text-xs leading-relaxed mt-3">
                Track your CNR cause lists, extract risks from agreements, and navigate BNS/BNSS criminal laws.
              </p>
            </div>

            <div className="mt-6 pt-5 border-t border-border/70 space-y-2.5 font-mono text-[11px] text-foreground/80">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-3.5 text-emerald-700 shrink-0" />
                <span>Client-side PII masking active</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="size-3.5 text-foreground/70 shrink-0" />
                <span>25 High Courts & NJDG synced</span>
              </div>
              <div className="flex items-center gap-2">
                <Scale className="size-3.5 text-amber-700 shrink-0" />
                <span>100% statutory section grounding</span>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-white/60 border border-border/50 font-mono text-[10px] text-foreground/70 space-y-1">
              <p className="font-semibold text-foreground/80 uppercase tracking-wider">Demo Credentials</p>
              <p>Email: <span className="text-foreground">demo@nyayi.ai</span></p>
              <p>Password: <span className="text-foreground">Demo@1234</span></p>
            </div>
          </div>

          {/* Right: Login Form Card */}
          <div className="lg:col-span-7 p-6 sm:p-7 rounded-2xl bg-white border border-border shadow-xs flex flex-col justify-center">
            <div className="mb-4">
              <h1 className="font-serif text-xl sm:text-2xl font-bold text-foreground">
                Sign in to workspace
              </h1>
              <p className="text-muted-foreground text-xs mt-0.5">
                Enter your email and password to access your workspace.
              </p>
            </div>

            <Suspense fallback={<p className="py-4 text-center text-xs text-muted-foreground font-mono">Loading form…</p>}>
              <AuthForm mode="login" />
            </Suspense>

            <p className="mt-4 text-center text-xs text-muted-foreground font-sans">
              Don&apos;t have an account yet?{" "}
              <Link href="/signup" className="font-semibold text-foreground underline underline-offset-2 hover:opacity-80">
                Create one in 10 seconds
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
