import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
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
            Create your account
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Citizens get plain-language guidance. Advocates get a legal workspace.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sign up</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense
              fallback={
                <p className="py-6 text-center text-sm text-ink-400">Loading…</p>
              }
            >
              <AuthForm mode="signup" />
            </Suspense>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-sm text-ink-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-navy-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
