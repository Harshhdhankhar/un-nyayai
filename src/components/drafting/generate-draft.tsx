"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { templates } from "@/lib/drafting/templates";
import { FileText, Loader2 } from "lucide-react";

export function GenerateDraft({
  matterId,
  initialFacts,
  initialParties,
}: {
  matterId: string;
  initialFacts: { fact: string }[];
  initialParties: { name: string; role: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<string>(templates[0].kind);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = {
    parties: initialParties.map((p) => ({ name: p.name, role: p.role })),
    amounts: [],
    dates: [],
    facts: initialFacts.map((f) => f.fact),
    laws: [],
  };

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/matters/${matterId}/drafts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, meta }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not generate draft.");
        return;
      }
      router.push(`/app/matters/${matterId}/drafts/${data.draft.id}`);
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setGenerating(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <FileText className="h-3.5 w-3.5" />
        Generate draft
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-ink-200 bg-white p-4">
      <div>
        <Label htmlFor="draftKind">Document type</Label>
        <select
          id="draftKind"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="h-10 w-full rounded-md border border-ink-200 bg-white px-3 text-sm text-ink-900 focus:border-navy-700 focus:outline-none"
        >
          {templates.map((t) => (
            <option key={t.kind} value={t.kind}>
              {t.label} — {t.description}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-critical-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={generate} loading={generating}>
          {generating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Generate from case facts
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
