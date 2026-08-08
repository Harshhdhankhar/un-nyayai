"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea, Label } from "@/components/ui/input";
import { Loader2, ArrowRight } from "lucide-react";

export interface RightsResult {
  category: string;
  categoryLabel: string;
  possibleRights: string[];
  possibleRemedies: string[];
  requiredFacts: string[];
  officialSources: { title: string; url: string }[];
  nextSteps: string[];
  legalAidOptions: string[];
  disclaimer: string;
}

export function RightsExplorer() {
  const [statement, setStatement] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RightsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function explore() {
    if (statement.trim().length < 10 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/rights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation: statement }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not analyse.");
        return;
      }
      setResult(data.result);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="situation">What happened?</Label>
        <Textarea
          id="situation"
          rows={4}
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          placeholder="e.g. My landlord kept my ₹40,000 security deposit after I vacated the flat in Pune…"
        />
        <div className="flex justify-end">
          <Button onClick={explore} loading={loading} size="sm">
            {!loading && <ArrowRight className="h-4 w-4" />}
            Explore my rights
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-critical-600">{error}</p>}

      {result && (
        <div className="space-y-5">
          <div className="rounded-md border border-navy-100 bg-navy-100/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-navy-800">
              Category
            </p>
            <p className="text-lg font-semibold text-navy-950">
              {result.categoryLabel}
            </p>
          </div>

          <Section title="Possible rights">
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink-700">
              {result.possibleRights.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </Section>

          {result.possibleRemedies.length > 0 && (
            <Section title="Possible remedies">
              <ul className="list-disc space-y-1 pl-5 text-sm text-ink-700">
                {result.possibleRemedies.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Facts that help">
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink-700">
              {result.requiredFacts.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </Section>

          {result.officialSources.length > 0 && (
            <Section title="Official sources">
              <ul className="space-y-1">
                {result.officialSources.map((s, i) => (
                  <li key={i}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-navy-700 underline"
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {result.nextSteps.length > 0 && (
            <Section title="Next steps">
              <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-700">
                {result.nextSteps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </Section>
          )}

          {result.legalAidOptions.length > 0 && (
            <Section title="Free legal aid options">
              <ul className="list-disc space-y-1 pl-5 text-sm text-ink-700">
                {result.legalAidOptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </Section>
          )}

          <p className="rounded-md bg-ink-100 px-3 py-2 text-xs text-ink-500">
            {result.disclaimer}
          </p>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-ink-200 bg-white p-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">
        {title}
      </p>
      {children}
    </div>
  );
}
