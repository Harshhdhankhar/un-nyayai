export function FaqSection() {
  const faqs = [
    {
      q: "Is it actually free, or will it lock my case behind a ₹999 paywall on step 3?",
      a: "Completely free. It connects to public National Judicial Data Grid (NJDG) APIs and official legislative gazettes. There are no retainers, no paywalls, and no countdown timers.",
    },
    {
      q: "Will this hallucinate section numbers like ChatGPT does?",
      a: "No. Generative LLMs hallucinate when asked to 'remember' statutes from memory. NyayAI works in reverse: it searches verified statutory gazettes first, extracts exact section text, and refuses to cite any provision that cannot be matched to the 2023 Gazette of India.",
    },
    {
      q: "What happens if I upload my rent agreement with my PAN and Aadhaar on it?",
      a: "Your browser runs client-side regex masking before the file content is analyzed. Aadhaar numbers, PAN cards, phone numbers, and bank accounts are replaced with [REDACTED] tokens. Your personal identity never touches public training sets.",
    },
    {
      q: "Does it understand Hinglish? ('Mera landlord deposit wapas nahi de raha')",
      a: "Yes. Most Indian disputes happen in conversational Hinglish. You don't need to know words like 'mesne profits' or 'interlocutory injunction'. Just describe what happened naturally.",
    },
    {
      q: "Does it support the new criminal laws (BNS, BNSS, BSA) or just old IPC?",
      a: "Both. It has direct mapping between the Indian Penal Code (1860) and Bharatiya Nyaya Sanhita (2023), so ongoing legacy cases and fresh FIRs are both properly referenced.",
    },
    {
      q: "Is this formal legal advice?",
      a: "No. It is an intelligent legal navigator and document parser. It gives you procedural transparency, statutory citations, and next-step clarity so you walk into meetings with advocates prepared rather than clueless.",
    },
  ];

  return (
    <section id="faq" className="scroll-mt-24 px-6 md:px-12 lg:px-24 py-24 sm:py-32 border-t border-border bg-white">
      <div className="mx-auto w-full max-w-5xl">
        <div className="grid gap-10 md:grid-cols-12 md:gap-14">
          <div className="md:col-span-4">
            <p className="text-muted-foreground font-mono text-[11px] tracking-[0.2em] uppercase">
              Questions
            </p>
            <h2 className="mt-5 font-serif text-3xl leading-tight sm:text-4xl text-balance">
              The honest questions people ask before typing their dispute.
            </h2>
          </div>

          <div className="space-y-3 md:col-span-7 md:col-start-6">
            {faqs.map(({ q, a }, idx) => (
              <details key={idx} className="card group bg-[#fcfbf9] hover:bg-white transition-colors">
                <summary className="flex cursor-pointer list-none items-start gap-4 font-serif text-lg leading-snug rounded-sm focus-visible:outline-none">
                  <span className="flex-1 font-semibold text-foreground">{q}</span>
                  <span
                    aria-hidden="true"
                    className="text-muted-foreground mt-1 shrink-0 font-mono text-sm transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="text-muted-foreground mt-3 text-base leading-relaxed">
                  {a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
