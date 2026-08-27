"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300 border-b",
        scrolled
          ? "border-border/80 bg-background/90 backdrop-blur-md"
          : "border-transparent bg-transparent"
      )}
    >
      <nav className="mx-auto flex h-14 w-full max-w-5xl items-center gap-6 px-6">
        {/* Logo */}
        <Logo size="nav" href="/" />

        {/* Desktop Nav Links */}
        <div className="text-muted-foreground ml-auto hidden items-center gap-6 text-sm lg:flex font-sans">
          <a
            href="/#demo"
            className="hover:text-foreground rounded-sm whitespace-nowrap transition-colors focus-visible:outline-none"
          >
            How it works
          </a>
          <a
            href="/#scenarios"
            className="hover:text-foreground rounded-sm whitespace-nowrap transition-colors focus-visible:outline-none"
          >
            Use cases
          </a>
          <a
            href="/#what"
            className="hover:text-foreground rounded-sm whitespace-nowrap transition-colors focus-visible:outline-none"
          >
            Features
          </a>
          <a
            href="/#sources"
            className="hover:text-foreground rounded-sm whitespace-nowrap transition-colors focus-visible:outline-none"
          >
            Privacy & Sources
          </a>
          <a
            href="/#faq"
            className="hover:text-foreground rounded-sm whitespace-nowrap transition-colors focus-visible:outline-none"
          >
            FAQ
          </a>
        </div>

        {/* Right CTA */}
        <div className="ml-auto flex items-center gap-2 lg:ml-0 lg:gap-3">
          <Link
            href="/app"
            className="btn-solid rounded-full px-5 py-2 text-sm font-semibold"
          >
            Open NyayAI
          </Link>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-label="Toggle navigation menu"
            className="text-muted-foreground hover:text-foreground grid size-8 shrink-0 place-items-center rounded-md transition-colors lg:hidden focus-visible:outline-none"
          >
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="border-b border-border bg-background px-6 py-6 shadow-xl lg:hidden">
          <nav className="flex flex-col gap-4 text-sm font-medium text-muted-foreground">
            <a
              href="/#demo"
              onClick={() => setMobileOpen(false)}
              className="hover:text-foreground py-1 transition-colors"
            >
              How it works
            </a>
            <a
              href="/#scenarios"
              onClick={() => setMobileOpen(false)}
              className="hover:text-foreground py-1 transition-colors"
            >
              Use cases
            </a>
            <a
              href="/#what"
              onClick={() => setMobileOpen(false)}
              className="hover:text-foreground py-1 transition-colors"
            >
              Features
            </a>
            <a
              href="/#sources"
              onClick={() => setMobileOpen(false)}
              className="hover:text-foreground py-1 transition-colors"
            >
              Privacy & Sources
            </a>
            <a
              href="/#faq"
              onClick={() => setMobileOpen(false)}
              className="hover:text-foreground py-1 transition-colors"
            >
              FAQ
            </a>
            <div className="pt-2 border-t border-border">
              <Link
                href="/app"
                onClick={() => setMobileOpen(false)}
                className="btn-solid w-full text-center py-2 text-xs"
              >
                Open NyayAI
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
