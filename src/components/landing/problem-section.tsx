export function ProblemSection() {
  return (
    <section id="story" className="scroll-mt-24 px-6 md:px-12 lg:px-24 py-24 sm:py-32 border-t border-border">
      <div className="mx-auto w-full max-w-5xl">
        <div className="grid gap-10 md:grid-cols-12 md:gap-14">
          <div className="md:col-span-4">
            <p className="text-muted-foreground font-mono text-[11px] tracking-[0.2em] uppercase">
              Why this exists
            </p>
            <h2 className="mt-5 font-serif text-3xl leading-tight sm:text-4xl">
              I built this because Indian court procedures shouldn’t require a law degree to understand.
            </h2>
          </div>
          <div className="space-y-6 md:col-span-7 md:col-start-6">
            <p className="text-lg leading-relaxed">
              A dispute starts, and suddenly you are handed a 16-character CNR, an unsearchable PDF order sheet, a notice with a 15-day countdown, and three different court portals that look like they were built in 2004.
            </p>
            <p className="text-lg leading-relaxed">
              The part that got me was how much of it was simple procedural navigation. Knowing when your hearing is, what Order 39 means, or why a rent agreement termination clause is illegal shouldn&apos;t require ₹50,000 in consultations.
            </p>
            <p className="text-muted-foreground border-l pl-5 text-base">
              It is free and open because there is no reason legal clarity should be gatekept.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

