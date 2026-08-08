"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      const next = params.get("next") ?? "/app";
      router.push(next);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === "signup" && (
        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" name="fullName" autoComplete="name" />
        </div>
      )}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={mode === "signup" ? 8 : undefined}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
        />
      </div>
      {mode === "signup" && (
        <div>
          <Label htmlFor="role">I am a…</Label>
          <select
            id="role"
            name="role"
            className="h-10 w-full appearance-none rounded-md border border-ink-200 bg-white px-3 text-sm text-ink-900 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-100"
            defaultValue="citizen"
          >
            <option value="citizen">Citizen — I have a legal problem</option>
            <option value="advocate">Advocate / legal professional</option>
          </select>
        </div>
      )}

      {error && (
        <p className="rounded-md bg-critical-100 px-3 py-2 text-sm text-critical-600">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" loading={loading}>
        {mode === "login" ? "Sign in" : "Create account"}
      </Button>

      {mode === "login" && (
        <div className="text-center text-sm">
          <Link href="/forgot-password" className="text-navy-700 hover:underline">
            Forgot password?
          </Link>
        </div>
      )}
    </form>
  );
}
