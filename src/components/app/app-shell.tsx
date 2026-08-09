"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ChevronRight,
  LogOut,
  Menu,
  Scale,
  UserRound,
  X,
} from "lucide-react";
import { mobileNav, primaryNav, secondaryNav } from "./nav";
import { cn } from "@/lib/utils";

interface RecentMatter {
  id: string;
  title: string;
  matterType: string;
}

export function AppShell({
  children,
  user,
  recentMatters = [],
}: {
  children: React.ReactNode;
  user: {
    id: string;
    email: string;
    fullName: string | null;
    role: string;
    isDemo: boolean;
  };
  recentMatters?: RecentMatter[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-svh bg-paper text-ink-900">
      {open ? (
        <button
          className="fixed inset-0 z-40 cursor-default bg-navy-950/30 backdrop-blur-[1px] lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[17.5rem] flex-col border-r border-ink-200 bg-[#f7f5ef] px-3 transition-transform duration-200 lg:w-[14.5rem] lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-20 items-center px-2">
          <Link href="/app" className="group flex items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-700">
            <span className="grid h-9 w-9 place-items-center border border-navy-900 bg-navy-950 text-paper transition-colors group-hover:bg-navy-800">
              <Scale className="h-[18px] w-[18px]" strokeWidth={1.7} />
            </span>
            <span>
              <span className="block font-serif-display text-[1.2rem] font-semibold leading-none text-navy-950">NyayAI</span>
              <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-500">Legal navigation</span>
            </span>
          </Link>
          <button onClick={() => setOpen(false)} className="ml-auto p-2 text-ink-500 lg:hidden" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav aria-label="Primary" className="space-y-0.5 border-t border-ink-200 pt-4">
          {primaryNav.map((item) => (
            <RailLink key={item.href} item={item} pathname={pathname} onNavigate={() => setOpen(false)} />
          ))}
        </nav>

        {recentMatters.length ? (
          <div className="mt-7 min-h-0">
            <div className="mb-2 flex items-center justify-between px-2">
              <p className="eyebrow">Recent matters</p>
              <Link href="/app/matters" aria-label="View all matters" className="text-ink-400 hover:text-navy-900">
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="space-y-0.5">
              {recentMatters.slice(0, 4).map((matter) => (
                <Link
                  key={matter.id}
                  href={`/app/matters/${matter.id}/overview`}
                  onClick={() => setOpen(false)}
                  className="block border-l border-transparent px-3 py-2 text-[12px] text-ink-600 transition-colors hover:border-navy-700 hover:bg-white/70 hover:text-navy-950"
                >
                  <span className="block truncate font-medium">{matter.title}</span>
                  <span className="mt-0.5 block truncate text-[10px] capitalize text-ink-400">{matter.matterType}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-auto border-t border-ink-200 py-3">
          {secondaryNav.map((item) => (
            <RailLink key={item.href} item={item} pathname={pathname} compact onNavigate={() => setOpen(false)} />
          ))}
          <div className="mt-2 flex items-center gap-2 border-t border-ink-200 px-2 pt-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy-100 text-navy-800">
              <UserRound className="h-4 w-4" />
            </span>
            <Link href="/app/settings" className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-ink-800">{user.fullName ?? user.email.split("@")[0]}</span>
              <span className="block truncate text-[10px] capitalize text-ink-500">{user.role}{user.isDemo ? " · demo" : ""}</span>
            </Link>
            <button onClick={logout} aria-label="Sign out" className="p-2 text-ink-400 hover:text-critical-600">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="min-h-svh lg:pl-[14.5rem]">
        <header className="sticky top-0 z-30 flex h-14 items-center border-b border-ink-200/80 bg-paper/92 px-4 backdrop-blur-md lg:hidden">
          <button onClick={() => setOpen(true)} className="-ml-2 p-2 text-navy-950" aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/app" className="ml-3 font-serif-display text-lg font-semibold text-navy-950">NyayAI</Link>
          <span className="ml-auto text-[9px] font-semibold uppercase tracking-[0.16em] text-verified-700">Source-aware</span>
        </header>
        <main className="min-h-svh pb-24 lg:pb-0">{children}</main>
      </div>

      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-ink-200 bg-[#fbfaf7]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden">
        {mobileNav.map((item) => {
          const href = item.href === "/app/menu" ? "#" : item.href;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.label}
              href={href}
              onClick={(event) => {
                if (item.href === "/app/menu") {
                  event.preventDefault();
                  setOpen(true);
                }
              }}
              className={cn("flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] font-medium", active ? "text-navy-950" : "text-ink-500")}
            >
              <item.icon className="h-[19px] w-[19px]" strokeWidth={active ? 2 : 1.6} />
              {item.shortLabel ?? item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app";
  return pathname.startsWith(href);
}

function RailLink({ item, pathname, compact = false, onNavigate }: { item: (typeof primaryNav)[number]; pathname: string; compact?: boolean; onNavigate?: () => void }) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 border-l-2 px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy-700",
        compact ? "py-2" : "py-2.5",
        active ? "border-navy-900 bg-white text-navy-950" : "border-transparent text-ink-600 hover:bg-white/70 hover:text-navy-950"
      )}
    >
      <item.icon className="h-[17px] w-[17px] shrink-0" strokeWidth={active ? 2 : 1.6} />
      {item.label}
    </Link>
  );
}
