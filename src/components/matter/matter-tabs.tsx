"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "overview", label: "Overview" },
  { href: "nyaypath", legacyHref: "strategy", label: "NyayPath" },
  { href: "case", label: "Case" },
  { href: "research", label: "Research" },
  { href: "documents", label: "Documents" },
  { href: "evidence", label: "Evidence" },
  { href: "timeline", label: "Timeline" },
  { href: "drafts", label: "Drafts" },
  { href: "delay-analysis", label: "Delay analysis" },
  { href: "second-opinion", label: "Second opinion" },
  { href: "hearings", label: "Hearing prep" },
];

export function MatterTabs({ matterId }: { matterId: string }) {
  const pathname = usePathname();
  const current = pathname.split("/").pop() ?? "overview";
  return (
    <nav aria-label="Matter sections" className="scrollbar-none -mx-4 overflow-x-auto border-y border-ink-200 px-4 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0">
      <div className="flex min-w-max">
        {tabs.map((tab) => {
          const active = current === tab.href || current === tab.legacyHref;
          return (
            <Link
              key={tab.href}
              href={`/app/matters/${matterId}/${tab.href}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative px-3.5 py-3 text-xs font-semibold transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-0.5",
                active ? "text-navy-950 after:bg-navy-950" : "text-ink-500 after:bg-transparent hover:text-navy-950"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
