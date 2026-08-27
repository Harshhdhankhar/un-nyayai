"use client";

import Link from "next/link";
import { HeroBoard } from "./hero-board";
import { Logo } from "./logo";
import { ArrowDown } from "lucide-react";

export function HeroSection() {
  return (
    <section
      id="hero"
      className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 md:px-12 lg:px-24 pt-24 pb-12 text-center"
    >
      {/* ── Continuous Avatar Grid with Center CSS Mask ── */}
      <HeroBoard />

      {/* ── Central Hero Content ── */}
      <div className="relative z-10 flex max-w-2xl flex-col items-center">
        {/* Eyebrow Pill */}
        <p className="border-foreground/20 text-foreground/80 mb-10 inline-flex items-center gap-2 rounded-full border bg-white/70 px-4 py-1.5 font-mono text-[11px] tracking-[0.14em] uppercase backdrop-blur-md sm:text-xs">
          <span className="relative flex size-2">
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          FREE FOREVER. RUNS ON INDIAN LAW.
        </p>

        {/* Hero Logo */}
        <h1>
          <Logo size="hero" />
        </h1>

        {/* Headline */}
        <p className="mt-10 font-sans text-[2.7rem] font-semibold leading-[1.08] tracking-tight text-balance sm:text-5xl">
          Indian legal navigation
          <br />
          is a maze.{" "}
          <span className="font-serif font-normal italic text-muted-foreground">
            Nobody
            <br />
            pays you to decode it.
          </span>
        </p>

        {/* Description */}
        <p className="text-muted-foreground mt-7 max-w-lg text-base leading-relaxed text-balance">
          So this does the clear half. It tracks your eCourts cases, extracts risks from agreements, and explains your next steps in plain words with sources you can verify.
        </p>

        {/* Action Buttons */}
        <div className="mt-11 flex flex-wrap items-center justify-center gap-3">
          <Link href="/app" className="btn-solid rounded-lg px-7 py-3 text-base font-semibold transition-transform hover:scale-[1.03] active:scale-[0.98] shadow-sm">
            Get started
          </Link>
          <a href="/#demo" className="btn-outline rounded-lg px-7 py-3 text-base font-medium transition-transform hover:scale-[1.03] active:scale-[0.98]">
            See what it does
          </a>
        </div>

        {/* Honest pre-launch tagline */}
        <p className="text-muted-foreground mt-8 font-mono text-xs">
          built for anyone navigating Indian law
        </p>
      </div>

      {/* Scroll indicator */}
      <a
        href="#demo"
        aria-label="Scroll to demo"
        className="scroll-hint text-muted-foreground absolute bottom-8 flex flex-col items-center gap-1 font-mono text-[10px] tracking-[0.2em] uppercase hover:text-foreground transition-colors cursor-pointer"
      >
        <span>SCROLL</span>
        <ArrowDown className="size-3 animate-bounce" />
      </a>
    </section>
  );
}
