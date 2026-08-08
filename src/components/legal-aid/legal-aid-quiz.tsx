"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Loader2, ArrowRight } from "lucide-react";

export interface Assessment {
  possibleEligibility: boolean;
  summary: string;
  reasons: string[];
  officialServices: { name: string; level: string; description: string }[];
  suggestedNextStep: string;
  needsOfficialConfirmation: boolean;
}

export function LegalAidQuiz() {
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("prefer_not");
  const [income, setIncome] = useState("");
  const [state, setState] = useState("");
  const [toggles, setToggles] = useState({
    disability: false,
    custody: false,
    scheduledCasteOrTribe: false,
    womenOrChild: false,
    industrialWorkman: false,
    victimOfTraffickingOrDisaster: false,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Assessment | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const ageNum = Number(age);
    const incomeNum = Number(income);
    if (!ageNum || ageNum < 1 || ageNum > 120) return;
    if (income === "" || Number.isNaN(incomeNum) || incomeNum < 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/legal-aid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ age: ageNum, gender, annualIncome: incomeNum, state, ...toggles }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not assess.");
        return;
      }
      setResult(data.assessment);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-md border border-ink-200 bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="age">Age</Label>
          <Input id="age" type="number" min={1} max={120} required value={age} onChange={(e) => setAge(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="income">Annual income (₹)</Label>
          <Input id="income" type="number" min={0} required value={income} onChange={(e) => setIncome(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="state">State</Label>
          <Input id="state" value={state} onChange={(e) => setState(e.target.value)} placeholder="optional" />
        </div>
      </div>

      <div className="space-y-2">
        {(
          [
            ["disability", "I have a disability"],
            ["custody", "I am in custody"],
            ["scheduledCasteOrTribe", "I belong to a Scheduled Caste / Scheduled Tribe"],
            ["womenOrChild", "I am a woman / child (or representing one)"],
            ["industrialWorkman", "I am an industrial workman"],
            ["victimOfTraffickingOrDisaster", "I am a victim of trafficking / mass disaster"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={toggles[key]}
              onChange={(e) => setToggles((t) => ({ ...t, [key]: e.target.checked }))}
              className="h-3.5 w-3.5 accent-navy-900"
            />
            {label}
          </label>
        ))}
      </div>

      <div className="flex justify-end">
        <Button type="submit" loading={loading} size="sm">
          {!loading && <ArrowRight className="h-4 w-4" />}
          Check eligibility
        </Button>
      </div>

      {error && <p className="text-sm text-critical-600">{error}</p>}

      {result && (
        <div className="space-y-3 rounded-md border border-navy-100 bg-navy-100/40 p-4">
          <p className="text-sm font-semibold text-navy-950">
            {result.possibleEligibility
              ? "You may be eligible for free legal aid"
              : "You may not qualify under common criteria"}
          </p>
          <p className="text-sm text-ink-700">{result.summary}</p>
          {result.reasons.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink-700">
              {result.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-navy-800">Where to go</p>
            <ul className="mt-1 space-y-1">
              {result.officialServices.map((s) => (
                <li key={s.name} className="text-sm text-ink-700">
                  <span className="font-medium">{s.name}</span> ({s.level}) — {s.description}
                </li>
              ))}
            </ul>
          </div>
          <p className="rounded-md bg-white px-3 py-2 text-xs text-ink-600">
            {result.suggestedNextStep}
          </p>
        </div>
      )}
    </form>
  );
}
