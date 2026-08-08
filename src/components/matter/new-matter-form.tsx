"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";

interface TriagePreview {
  category: string;
  subCategory: string;
  confidence: number;
  summary: string;
  facts: { fact: string; kind: string }[];
  missingFacts: string[];
  possiblePathways: string[];
  followUpQuestions: string[];
}

export function NewMatterForm() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [triaging, setTriaging] = useState(false);
  const [triage, setTriage] = useState<TriagePreview | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runTriage() {
    if (description.trim().length < 10) return;
    setTriaging(true);
    setError(null);
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statement: description, language: "en" }),
      });
      const data = await res.json();
      if (data.ok) {
        setTriage(data.triage);
      } else {
        setError(data.error ?? "Triage failed.");
      }
    } catch {
      setError("Could not run triage. You can still create the matter manually.");
    } finally {
      setTriaging(false);
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const body = {
      title: form.get("title"),
      description: form.get("description"),
      matterType: form.get("matterType") ?? (triage?.category ?? "other"),
      subCategory: triage?.subCategory ?? undefined,
      jurisdiction: form.get("jurisdiction") || undefined,
      court: form.get("court") || undefined,
      cnr: form.get("cnr") || undefined,
      facts: triage?.facts.map((f) => ({ fact: f.fact })) ?? [],
    };
    try {
      const res = await fetch("/api/matters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create matter.");
        return;
      }
      router.push(`/app/matters/${data.matter.id}`);
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Describe your situation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Matter title</Label>
            <Input
              id="title"
              name="title"
              required
              placeholder="e.g. Security deposit not returned"
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label htmlFor="description">What happened?</Label>
              <button
                type="button"
                onClick={runTriage}
                disabled={triaging || description.trim().length < 10}
                className="inline-flex items-center gap-1 rounded-md bg-navy-100 px-2 py-1 text-xs font-medium text-navy-800 transition-colors hover:bg-navy-200 disabled:opacity-50"
              >
                {triaging ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                Auto-detect
              </button>
            </div>
            <Textarea
              id="description"
              name="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="My landlord hasn't returned my ₹40,000 security deposit…"
            />
          </div>

          {triage && (
            <div className="space-y-3 rounded-md border border-navy-100 bg-navy-100/40 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-navy-900">
                  {triage.category} · {triage.subCategory || "general"}
                </p>
                <span className="text-xs text-ink-500">
                  confidence {Math.round(triage.confidence * 100)}%
                </span>
              </div>
              {triage.summary && (
                <p className="text-sm text-ink-700">{triage.summary}</p>
              )}
              {triage.missingFacts.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase text-ink-500">
                    Facts we still need
                  </p>
                  <ul className="mt-1 list-disc pl-5 text-sm text-ink-700">
                    {triage.missingFacts.slice(0, 4).map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
              {triage.possiblePathways.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase text-ink-500">
                    Possible pathways
                  </p>
                  <ul className="mt-1 list-disc pl-5 text-sm text-ink-700">
                    {triage.possiblePathways.slice(0, 3).map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="matterType">Category</Label>
            <Select
              id="matterType"
              name="matterType"
              defaultValue={triage?.category ?? "other"}
              key={triage?.category ?? "other"}
            >
              <option value="employment">Employment</option>
              <option value="civil">Civil</option>
              <option value="criminal">Criminal</option>
              <option value="consumer">Consumer</option>
              <option value="property">Property / tenancy</option>
              <option value="family">Family</option>
              <option value="cyber">Cyber</option>
              <option value="commercial">Commercial</option>
              <option value="constitutional">Constitutional</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="jurisdiction">State / City</Label>
            <Input id="jurisdiction" name="jurisdiction" placeholder="Delhi" />
          </div>
          <div>
            <Label htmlFor="court">Court</Label>
            <Input id="court" name="court" placeholder="e.g. Tis Hazari, Delhi" />
          </div>
          <div>
            <Label htmlFor="cnr">CNR number (if you have one)</Label>
            <Input id="cnr" name="cnr" placeholder="e.g. DLND020000012024" />
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-md bg-critical-100 px-3 py-2 text-sm text-critical-600">
          {error}
        </p>
      )}

      <Button type="submit" loading={submitting} size="lg">
        Create matter
      </Button>
    </form>
  );
}
