import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-paper px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-lg font-semibold tracking-tight text-navy-900">
            NyayAI
          </span>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink-900">
            Reset your password
          </h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Forgot password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-ink-500">
              In the local/demo deployment, password reset email is not sent. Contact
              your administrator to reset your password.
            </p>
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center rounded-md bg-navy-900 px-4 text-sm font-medium text-white hover:bg-navy-800"
            >
              Back to sign in
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
