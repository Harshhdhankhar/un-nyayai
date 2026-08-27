import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-[#ffffff] px-6 py-12 select-none">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground">
            <span
              className="logo group inline-flex select-none items-baseline font-mono tracking-tight text-2xl font-bold"
              aria-label="unnyayai"
            >
              <span className="logo__struck mr-0.5">
                un
                <span className="logo__strike" aria-hidden="true" />
              </span>
              <span className="text-[#111418]">nyayai</span>
              <span className="logo__caret ml-0.5 text-[#111418]" aria-hidden="true">
                _
              </span>
            </span>
          </Link>
          <h1 className="mt-6 font-serif text-3xl font-normal tracking-tight text-[#111418]">
            Reset your password.
          </h1>
          <p className="mt-2 text-sm text-[#5a6578]">
            Password reset by email isn&apos;t available in this deployment yet.
          </p>
        </div>

        <div className="rounded-2xl border border-border/90 bg-white p-6 sm:p-8 shadow-xs space-y-4 text-center">
          <p className="text-sm text-[#5a6578] leading-relaxed">
            If you&apos;ve forgotten your password, please contact your NyayAI administrator to have it reset. Otherwise, return to the sign-in page to continue.
          </p>
          <Link
            href="/login"
            className="w-full h-11 rounded-lg bg-[#111418] text-white text-sm font-medium transition hover:bg-black/90 flex items-center justify-center shadow-xs"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

