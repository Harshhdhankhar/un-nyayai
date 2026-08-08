"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, X, UserRound } from "lucide-react";
import { navForRole } from "./nav";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: {
    id: string;
    email: string;
    fullName: string | null;
    role: string;
    isDemo: boolean;
  };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const nav = navForRole(user.role);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-svh bg-paper">
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-navy-950/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-ink-200 bg-white transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-ink-100 px-5">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-navy-900 text-sm font-bold text-white">
              N
            </span>
            <span className="text-base font-semibold tracking-tight text-navy-900">
              NyayAI
            </span>
          </Link>
          <button
            className="ml-auto lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-ink-500" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wide text-ink-400">
            {user.role === "advocate" ? "Legal workspace" : "My workspace"}
          </p>
          {nav.map((item) => {
            const active =
              item.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-navy-100 text-navy-900"
                    : "text-ink-700 hover:bg-ink-100"
                )}
              >
                <item.icon className="h-4.5 w-4.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-ink-100 p-3">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-100 text-ink-700">
              <UserRound className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-900">
                {user.fullName ?? user.email.split("@")[0]}
              </p>
              <p className="truncate text-xs capitalize text-ink-500">
                {user.role}
                {user.isDemo ? " · demo" : ""}
              </p>
            </div>
            <button
              onClick={logout}
              aria-label="Sign out"
              className="rounded-md p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-900"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-ink-200 bg-white px-4 lg:px-8">
          <button
            className="rounded-md p-2 text-ink-700 hover:bg-ink-100 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <span className="hidden rounded-full bg-verified-100 px-2.5 py-1 text-xs font-medium text-verified-700 sm:inline-flex">
            Not legal advice
          </span>
        </header>
        <main className="flex-1 px-4 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
