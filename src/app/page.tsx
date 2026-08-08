import Link from "next/link";
import { HeroInput } from "@/components/landing/hero-input";
import {
  Scale,
  FileText,
  Landmark,
  ShieldAlert,
  Briefcase,
  Home,
  Heart,
  ShoppingCart,
  HandHeart,
  ArrowRight,
  CheckCircle2,
  MapPin,
} from "lucide-react";

const situations = [
  { icon: Scale, title: "Someone didn't pay me", href: "/app/assistant?q=I am owed money" },
  { icon: FileText, title: "I received a legal notice", href: "/app/assistant?q=I received a legal notice" },
  { icon: Landmark, title: "I have a court case", href: "/app/case-status" },
  { icon: ShieldAlert, title: "I was scammed online", href: "/app/assistant?q=I was scammed online" },
  { icon: Home, title: "Property dispute", href: "/app/assistant?q=I have a property dispute" },
  { icon: Briefcase, title: "Employment problem", href: "/app/assistant?q=My employer is treating me unfairly" },
  { icon: Heart, title: "Family problem", href: "/app/assistant?q=I have a family legal problem" },
  { icon: ShoppingCart, title: "Consumer complaint", href: "/app/assistant?q=I have a consumer complaint" },
  { icon: HandHeart, title: "I need free legal help", href: "/app/legal-aid" },
];

const journey = [
  "Understand the situation",
  "Know your rights",
  "Identify the possible path",
  "Prepare documents & evidence",
  "Access official help",
  "Track the matter",
];

export default function HomePage() {
  return (
    <>
      {/* Header */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-navy-900 text-sm font-bold text-white">
            N
          </span>
          <span className="text-lg font-semibold tracking-tight text-navy-900">
            NyayAI
          </span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-md px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-100"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800"
          >
            Get started
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-4xl px-6 pb-20 pt-14 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-medium text-ink-500">
          <MapPin className="h-3.5 w-3.5 text-navy-700" />
          Legal navigation for India
        </span>
        <h1 className="mx-auto mt-6 max-w-2xl text-balance text-4xl font-semibold leading-tight tracking-tight text-navy-950 sm:text-5xl">
          Tell us what happened.
          <span className="block text-ink-500">You don&apos;t need to know the law.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-balance text-lg leading-relaxed text-ink-500">
          NyayAI turns legal problems into clear, verified next steps — from
          understanding your rights to preparing your matter and navigating
          your case.
        </p>
        <HeroInput />
      </section>

      {/* Situation cards */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-20">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-400">
          What happened?
        </h2>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {situations.map(({ icon: Icon, title, href }) => (
            <Link
              key={title}
              href={href}
              className="group flex items-center gap-3 rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-navy-300 hover:bg-white"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-navy-100 text-navy-800">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <span className="text-sm font-medium text-ink-900">{title}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-ink-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-navy-950">
                Not a chat wrapper. A navigation system.
              </h2>
              <p className="mt-3 leading-relaxed text-ink-500">
                Existing tools help you search law. NyayAI helps you navigate a
                legal problem — from the first real-world event to the next
                hearing, with verified sources at every step.
              </p>
              <div className="mt-8 space-y-3">
                {journey.map((step, i) => (
                  <div key={step} className="flex items-center gap-3 text-sm text-ink-700">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-100 text-xs font-semibold text-navy-800">
                      {i + 1}
                    </span>
                    {step}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-ink-200 bg-paper p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink-900">
                  Matter readiness
                </p>
                <span className="text-sm font-semibold text-verified-700">72 / 100</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-ink-200">
                <div className="h-2 w-[72%] rounded-full bg-verified-600" />
              </div>
              <div className="mt-5 space-y-2 text-sm text-ink-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-verified-600" />
                  Facts complete
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-verified-600" />
                  Documents uploaded
                </div>
                <div className="flex items-center gap-2 text-amber-700">
                  <ArrowRight className="h-4 w-4" />
                  Next: send written demand
                </div>
                <div className="flex items-center gap-2 text-ink-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-ink-400" />
                  Timeline needs completion
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="flex flex-col items-center gap-4 rounded-xl border border-ink-200 bg-navy-900 px-8 py-12 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-white">
              Start with your problem.
            </h2>
            <p className="mt-1 text-sm text-navy-100/80">
              Free. In your language. Built for people, not just lawyers.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-medium text-navy-900 hover:bg-navy-100"
            >
              Start with your problem
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-md border border-white/30 px-5 py-3 text-sm font-medium text-white hover:bg-navy-800"
            >
              Open legal workspace
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-ink-400 sm:flex-row">
          <p>© {new Date().getFullYear()} NyayAI. Not a substitute for legal advice.</p>
          <p>
            NyayAI helps you navigate the legal system — it does not provide
            legal representation.
          </p>
        </div>
      </footer>
    </>
  );
}
