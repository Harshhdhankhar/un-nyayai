"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AccountSettings({
  user,
}: {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    isDemo: boolean;
    consentSigned: boolean;
    createdAt: string;
  };
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(user.fullName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update.");
        return;
      }
      setMessage("Profile updated.");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={user.email} disabled />
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="slate">{user.role}</Badge>
              {user.isDemo && <Badge tone="amber">demo account</Badge>}
              {user.consentSigned ? (
                <Badge tone="green">consent signed</Badge>
              ) : (
                <Badge tone="outline">consent pending</Badge>
              )}
            </div>
            {message && <p className="text-sm text-verified-700">{message}</p>}
            {error && <p className="text-sm text-critical-600">{error}</p>}
            <Button type="submit" size="sm" loading={saving}>
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-ink-400">
            Signed in as {user.email}. Member since{" "}
            {new Date(user.createdAt).toLocaleDateString("en-IN")}.
          </p>
          <Button variant="outline" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Privacy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs leading-relaxed text-ink-500">
            NyayAI stores your matters, documents and research locally in your
            account. Nothing is shared with third parties. AI responses may use
            third-party providers (e.g. Groq) when configured; when they are
            unavailable, all answers are produced offline and labelled as such.
            Data is never used to train models.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
