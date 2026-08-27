"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Files,
  FolderKanban,
  Landmark,
  LogOut,
  Menu,
  MessageSquareText,
  Plus,
  Search,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import { CommandPalette } from "./command-palette";
import { FloatingAssistant } from "./floating-assistant";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/app/case-status", label: "Cases Tracker", icon: Landmark },
  { href: "/app/case-status?tab=search", label: "Case Search", icon: Search },
  { href: "/app/documents", label: "Doc Analyzer", icon: Files },
  { href: "/app/matters", label: "Matters", icon: FolderKanban },
];

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
  recentMatters?: { id: string; title: string; matterType: string }[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function isItemActive(href: string) {
    const clean = href.split("?")[0];
    if (clean === "/app") return pathname === "/app";
    return pathname.startsWith(clean);
  }

  return (
    <div className="min-h-svh bg-[#fbfaf7] text-foreground selection:bg-border">
      {/* Sleek Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-[#fbfaf7]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          {/* Left: Brand Logo */}
          <div className="flex items-center gap-6">
            <Link
              href="/app"
              className="group flex items-baseline gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
            >
              <span className="font-mono text-base tracking-tight text-foreground">
                <span className="logo__struck mr-0.5">
                  un
                  <span className="logo__strike" aria-hidden="true" />
                </span>
                <span className="font-bold text-foreground">nyayai</span>
                <span className="logo__caret ml-0.5 font-bold text-foreground" aria-hidden="true">_</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono tracking-[0.14em] uppercase text-muted-foreground">
                WORKSPACE
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
              {NAV_ITEMS.map((item) => {
                const active = isItemActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-md px-2.5 py-1.5 transition-colors",
                      active
                        ? "bg-paper-warm border border-border text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-paper-warm/60"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Search ⌘K + New Matter + User Profile */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setCmdOpen(true)}
              className="flex items-center gap-2 rounded-md border border-border bg-paper-warm/80 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              aria-label="Open command search"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline font-mono text-[11px]">Search</span>
              <kbd className="hidden sm:inline rounded border border-border bg-white px-1 py-0.2 font-mono text-[9px] font-semibold text-muted-foreground">⌘K</kbd>
            </button>

            <Link
              href="/app/matters/new"
              className="btn-solid text-xs py-1.5 px-2.5 sm:px-3 rounded-md font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Matter</span>
            </Link>

            {/* User Profile */}
            <Link
              href="/app/settings"
              title="Settings & Profile"
              className="grid size-7 place-items-center rounded-full bg-paper-warm text-foreground border border-border font-mono text-xs font-semibold hover:border-foreground transition-colors"
            >
              {user.fullName ? user.fullName[0].toUpperCase() : user.email[0].toUpperCase()}
            </Link>

            <button
              onClick={logout}
              aria-label="Sign out"
              title="Sign out"
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded hidden sm:block"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="p-1.5 text-muted-foreground hover:text-foreground md:hidden"
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileOpen && (
          <div className="border-b border-border bg-[#fbfaf7] px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-2 text-sm font-medium text-muted-foreground">
              {NAV_ITEMS.map((item) => {
                const active = isItemActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 transition-colors",
                      active
                        ? "bg-paper-warm border border-border text-foreground font-semibold"
                        : "hover:bg-paper-warm hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
                <span className="font-mono text-xs text-muted-foreground">
                  {user.fullName ?? user.email}
                </span>
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Full-Width Content */}
      <main className="min-h-[calc(100svh-3.5rem)]">
        {children}
      </main>

      <CommandPalette
        key={cmdOpen ? "open" : "closed"}
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        recentMatters={recentMatters}
      />

      {/* Global Persistent Floating Legal Assistant */}
      <FloatingAssistant user={user} />
    </div>
  );
}

