"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "overview", label: "Overview" },
  { href: "timeline", label: "Timeline" },
  { href: "documents", label: "Documents" },
  { href: "evidence", label: "Evidence" },
  { href: "strategy", label: "Strategy" },
  { href: "drafts", label: "Drafts" },
  { href: "hearings", label: "Hearings" },
  { href: "research", label: "Research" },
];

export function MatterTabs({ matterId }: { matterId: string }) {
  const pathname = usePathname();
  const current = pathname.split("/").pop() ?? "overview";
  return (
    <div className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {tabs.map((tab) => {
        const active = current === tab.href;
        return (
          <Link
            key={tab.href}
            href={`/app/matters/${matterId}/${tab.href}`}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-navy-900 text-white"
                : "text-ink-700 hover:bg-ink-100"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
