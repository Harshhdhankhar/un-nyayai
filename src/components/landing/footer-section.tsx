import Link from "next/link";

export function FooterSection() {
  return (
    <footer className="border-t border-border bg-[#f8f6f0]">
      <div className="text-muted-foreground mx-auto w-full max-w-5xl px-6 md:px-12 lg:px-24 py-12 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <div className="mb-2">
            <span className="font-mono text-base tracking-tight text-foreground select-none">
              <span className="logo__struck mr-0.5">
                un
                <span className="logo__strike" aria-hidden="true" />
              </span>
              <span className="font-bold text-foreground">nyayai</span>
              <span className="logo__caret ml-0.5 font-bold text-foreground" aria-hidden="true">_</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            An open-source initiative for transparent, accessible Indian legal navigation.
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground/70">
            Not formal legal advice · Grounded in official eCourts & Gazette of India public registries
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
          <Link href="/login" className="hover:text-foreground transition-colors">Login</Link>
          <span>·</span>
          <Link href="/signup" className="hover:text-foreground transition-colors">Sign up</Link>
          <span>·</span>
          <a href="#top" className="hover:text-foreground transition-colors">Back to top ↑</a>
        </div>
      </div>
    </footer>
  );
}

