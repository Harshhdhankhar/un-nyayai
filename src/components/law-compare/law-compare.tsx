"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface Mapping {
  id: string;
  oldAct: string;
  oldSection: string;
  oldText: string | null;
  newAct: string;
  newSection: string;
  newText: string | null;
  similarity: string;
  importantChange: string | null;
  proceduralImpact: string | null;
  verifiedSource: string | null;
}

const toneForSimilarity: Record<string, "green" | "amber" | "red" | "slate"> = {
  identical: "green",
  renumbered: "slate",
  amended: "amber",
  new: "slate",
  repealed: "red",
};

export function LawCompare({ mappings }: { mappings: Mapping[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return mappings;
    return mappings.filter(
      (m) =>
        m.oldSection.toLowerCase().includes(needle) ||
        m.newSection.toLowerCase().includes(needle) ||
        (m.oldText ?? "").toLowerCase().includes(needle) ||
        (m.newText ?? "").toLowerCase().includes(needle) ||
        m.newAct.toLowerCase().includes(needle) ||
        m.oldAct.toLowerCase().includes(needle)
    );
  }, [q, mappings]);

  return (
    <div className="space-y-4">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by section number or keyword, e.g. 302, theft, murder…"
        aria-label="Search law mapping"
      />
      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-sm text-ink-400">No matching mapping found.</p>
        )}
        {filtered.map((m) => (
          <div key={m.id} className="rounded-md border border-ink-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink-900">
                {m.oldSection} → {m.newSection}
              </p>
              <Badge tone={toneForSimilarity[m.similarity] ?? "slate"}>
                {m.similarity}
              </Badge>
            </div>
            <div className="mt-2 grid gap-2 text-xs text-ink-600 sm:grid-cols-2">
              <div className="rounded bg-ink-100/60 p-2">
                <p className="font-medium text-ink-900">{m.oldAct}</p>
                <p>{m.oldText ?? "—"}</p>
              </div>
              <div className="rounded bg-navy-100/40 p-2">
                <p className="font-medium text-navy-900">{m.newAct}</p>
                <p>{m.newText ?? "—"}</p>
              </div>
            </div>
            {m.importantChange && (
              <p className="mt-2 text-xs text-amber-700">
                <span className="font-medium">Important change:</span>{" "}
                {m.importantChange}
              </p>
            )}
            {m.proceduralImpact && (
              <p className="mt-1 text-xs text-ink-500">
                <span className="font-medium">Procedure:</span>{" "}
                {m.proceduralImpact}
              </p>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-ink-400">
        Mappings are reference material. Verify with the official statute text.
      </p>
    </div>
  );
}
