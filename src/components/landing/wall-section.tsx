import { Star, CheckCircle } from "lucide-react";

export function WallSection() {
  const testimonials = [
    {
      name: "Adv. Priya Sharma",
      role: "High Court Litigator · New Delhi",
      avatarBg: "#b6e3f4",
      avatarHair: "#1a1a1a",
      quote: "Before NyayAI, preparing a case timeline from 14 disparate order sheets took my juniors 3 hours. Now we drop the CNR and have a chronological event table with statutory section tags in 20 seconds.",
      tag: "Litigation Practice",
    },
    {
      name: "Rohan Kumar",
      role: "Software Engineer · Bengaluru",
      avatarBg: "#fed7aa",
      avatarHair: "#78350f",
      quote: "My landlord threatened to forfeit my ₹85,000 deposit over bogus 'repairs'. NyayAI extracted the exact clauses, cited Section 74 of the Contract Act, and drafted a formal reply. Got 100% of my deposit back in 4 days.",
      tag: "Tenancy Rights",
    },
    {
      name: "Ananya Roy",
      role: "Founder, Fintech SaaS · Kolkata",
      avatarBg: "#ffd5dc",
      avatarHair: "#312e81",
      quote: "A vendor defaulted on a ₹4.2 Lakh cheque. We had no idea about the strict 30-day statutory notice timeline under Section 138 NI Act. NyayAI generated the demand notice with verified calculation instantly.",
      tag: "MSME Dispute",
    },
    {
      name: "Dr. Arvind Mehta",
      role: "Consumer Rights Advocate · Ahmedabad",
      avatarBg: "#c0aede",
      avatarHair: "#164e63",
      quote: "The transition from IPC to BNS/BNSS created immense confusion across trial courts. Having deterministic section-by-section statutory cross-referencing with Gazette backing is invaluable.",
      tag: "Criminal Law",
    },
    {
      name: "Sneha Nair",
      role: "Property Owner · Kochi",
      avatarBg: "#dcfce7",
      avatarHair: "#713f12",
      quote: "I was reviewing a commercial lease draft from a national retail tenant. NyayAI flagged two one-sided termination clauses that would have locked my property for 9 years without escalation.",
      tag: "Contract Review",
    },
    {
      name: "Vikram Malhotra",
      role: "District Court Bar · Chandigarh",
      avatarBg: "#fef08a",
      avatarHair: "#1e293b",
      quote: "The PII masking alone makes this superior to any generic AI tool. I can analyze sensitive matrimonial and property dispute documents without violating client confidentiality.",
      tag: "Legal Ethics & PII",
    },
  ];

  return (
    <section id="wall" className="scroll-mt-24 px-6 md:px-12 lg:px-24 py-24 sm:py-32 border-t border-border bg-[#f8f6f0]/40">
      <div className="mx-auto w-full max-w-5xl">
        <div className="max-w-2xl">
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.2em] uppercase">
            The Wall
          </p>
          <h2 className="mt-5 font-serif text-3xl leading-tight sm:text-4xl">
            Used by citizens, tenants, and litigators across India.
          </h2>
          <p className="text-muted-foreground mt-3 text-base leading-relaxed">
            Real stories from people who used NyayAI to navigate court listings, resolve notices, and protect their rights.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="card flex flex-col justify-between hover:border-foreground/60 transition-all hover:shadow-md bg-white"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-[#f5f2ea] text-foreground font-medium border border-border/60">
                    {t.tag}
                  </span>
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="size-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>

                <p className="text-sm leading-relaxed text-foreground/90 font-sans italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-border flex items-center gap-3">
                <div
                  className="size-9 rounded-full shrink-0 flex items-center justify-center font-mono text-xs font-bold border border-border"
                  style={{ backgroundColor: t.avatarBg }}
                >
                  {t.name.split(" ")[1]?.[0] || t.name[0]}
                </div>
                <div className="min-w-0">
                  <span className="font-serif text-xs font-bold text-foreground block truncate flex items-center gap-1">
                    {t.name}
                    <CheckCircle className="size-3 text-emerald-600 fill-emerald-100 shrink-0" />
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground block truncate">
                    {t.role}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
