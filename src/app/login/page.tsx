import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-paper px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-navy-900 text-sm font-bold text-white">
              N
            </span>
            <span className="text-lg font-semibold tracking-tight text-navy-900">
              NyayAI
            </span>
          </Link>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink-900">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Your legal navigation workspace.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense
              fallback={
                <p className="py-6 text-center text-sm text-ink-400">Loading…</p>
              }
            >
              <AuthForm mode="login" />
            </Suspense>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-sm text-ink-500">
          New here?{" "}
          <Link href="/signup" className="font-medium text-navy-700 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
