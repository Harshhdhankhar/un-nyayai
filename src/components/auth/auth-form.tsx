"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  function continueToApp() {
    const next = params.get("next") ?? "/app";
    router.push(next);
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      email: form.get("email"),
      password: form.get("password"),
      fullName: form.get("fullName"),
      role: form.get("role") ?? "citizen",
    };
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      continueToApp();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin() {
    setError(null);
    setDemoLoading(true);
    try {
      const res = await fetch("/api/auth/demo", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start a demo session.");
        return;
      }
      continueToApp();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {mode === "signup" && (
        <div>
          <label htmlFor="fullName" className="block text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
            Full name
          </label>
          <input
            id="fullName"
            name="fullName"
            autoComplete="name"
            placeholder="Adv. Priya Sharma"
            className="w-full h-9.5 px-3 rounded-lg border border-border bg-white text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
          />
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="w-full h-9.5 px-3 rounded-lg border border-border bg-white text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="password" className="block text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            Password
          </label>
          {mode === "login" && (
            <Link href="/forgot-password" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
              Forgot?
            </Link>
          )}
        </div>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={mode === "signup" ? 8 : undefined}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
          className="w-full h-9.5 px-3 rounded-lg border border-border bg-white text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
        />
      </div>

      {mode === "signup" && (
        <div>
          <label htmlFor="role" className="block text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
            Using NyayAI as
          </label>
          <div className="relative">
            <select
              id="role"
              name="role"
              className="w-full h-9.5 px-3 rounded-lg border border-border bg-white text-xs sm:text-sm text-foreground appearance-none transition-colors focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground cursor-pointer"
              defaultValue="citizen"
            >
              <option value="citizen">Citizen — I have a legal matter or inquiry</option>
              <option value="advocate">Advocate / Legal practitioner</option>
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px] font-mono">
              ▼
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50/70 p-2.5 text-xs text-rose-700 leading-relaxed">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || demoLoading}
        className="w-full h-10 rounded-lg bg-[#111418] text-white text-xs sm:text-sm font-medium transition hover:bg-black/90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs cursor-pointer mt-1"
      >
        {loading ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            <span>Processing…</span>
          </>
        ) : mode === "login" ? (
          "Sign in to workspace"
        ) : (
          "Create workspace account"
        )}
      </button>

      <div className="relative flex items-center justify-center py-1" aria-hidden="true">
        <span className="w-full border-t border-border" />
        <span className="absolute bg-white px-2.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
          or
        </span>
      </div>

      <button
        type="button"
        disabled={loading || demoLoading}
        onClick={handleDemoLogin}
        className="w-full h-9.5 rounded-lg border border-border bg-white text-foreground text-xs sm:text-sm font-medium transition hover:bg-[#f5f2ea] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
      >
        {demoLoading ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            <span>Starting demo…</span>
          </>
        ) : mode === "signup" ? (
          "Skip — continue with demo session"
        ) : (
          "Continue with instant demo"
        )}
      </button>
    </form>
  );
}
