import Link from "next/link";
import { ArrowLeftRight, BookOpenText, CircleHelp, Files, Landmark, Search, Settings } from "lucide-react";

const destinations = [
  { href: "/app/research", label: "Research", description: "Search and inspect Indian legal sources.", icon: Search },
  { href: "/app/case-status", label: "Cases", description: "Check a case by CNR or details.", icon: Landmark },
  { href: "/app/documents", label: "Documents", description: "Review documents across your Matters.", icon: Files },
  { href: "/app/legal-aid", label: "Legal help", description: "Find official legal-aid pathways.", icon: CircleHelp },
  { href: "/app/rights", label: "Know your rights", description: "Understand rights by situation.", icon: BookOpenText },
  { href: "/app/law-compare", label: "Old vs new law", description: "Compare IPC↔BNS, CrPC↔BNSS and more.", icon: ArrowLeftRight },
  { href: "/app/settings", label: "Settings", description: "Account and provider status.", icon: Settings },
];

export default function MorePage() {
  return (
    <div className="workspace-page max-w-3xl">
      <header>
        <p className="eyebrow text-navy-700">More tools</p>
        <h1 className="mt-3 font-serif-display text-4xl text-navy-950">Navigate your legal workspace.</h1>
      </header>
      <nav className="mt-8 border-t border-ink-300" aria-label="Additional destinations">
        {destinations.map(({ href, label, description, icon: Icon }) => (
          <Link key={href} href={href} className="group grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b border-ink-200 py-5">
            <Icon className="h-5 w-5 text-navy-700" />
            <span><strong className="block text-sm text-navy-950">{label}</strong><span className="mt-1 block text-xs text-ink-500">{description}</span></span>
            <span className="text-sm text-ink-300 group-hover:text-navy-800">→</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
