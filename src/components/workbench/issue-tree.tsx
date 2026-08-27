"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Issue } from "@/lib/workbench/types";
import { SourceRefs } from "./source-refs";

const COVERAGE_TONE: Record<Issue["coverage"], string> = {
  SUPPORTED: "bg-verified-100 text-verified-700",
  PARTIALLY_SUPPORTED: "bg-navy-100 text-navy-800",
  DISPUTED: "bg-critical-100 text-critical-600",
  MISSING_INFORMATION: "bg-critical-100 text-critical-600",
  NEEDS_RESEARCH: "bg-amber-100 text-amber-700",
};

const COVERAGE_LABEL: Record<Issue["coverage"], string> = {
  SUPPORTED: "Supported",
  PARTIALLY_SUPPORTED: "Partially supported",
  DISPUTED: "Disputed",
  MISSING_INFORMATION: "Missing information",
  NEEDS_RESEARCH: "Needs research",
};

export function IssueTree({ issues }: { issues: Issue[] }) {
  if (issues.length === 0) {
    return <p className="text-sm leading-6 text-ink-500">No distinct issues could be derived from the recorded matter yet.</p>;
  }
  return (
    <ul className="space-y-2">
      {issues.map((issue) => (
        <IssueRow key={issue.id} issue={issue} />
      ))}
    </ul>
  );
}

function IssueRow({ issue }: { issue: Issue }) {
  const [open, setOpen] = useState(false);
  const hasFacts = issue.factIds.length > 0 || issue.evidenceIds.length > 0 || issue.authorityIds.length > 0 || Boolean(issue.gap);
  return (
    <li className="rounded-lg border border-ink-200 bg-white">
      <div className="flex items-start gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={() => hasFacts && setOpen((v) => !v)}
          className={cn("mt-0.5 text-ink-400 transition-transform", hasFacts && "hover:text-navy-800", open && "rotate-180")}
          aria-label="Toggle issue"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", COVERAGE_TONE[issue.coverage])}>
              {COVERAGE_LABEL[issue.coverage]}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">{issue.type}</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-navy-950">{issue.question}</p>
          <p className="text-xs text-ink-500">{issue.title}</p>
        </div>
      </div>
      {open && (
        <div className="space-y-2 border-t border-ink-100 px-3 py-3 pl-9">
          {issue.gap ? (
            <p className="rounded-md bg-critical-100 px-2 py-1.5 text-xs text-critical-600">
              <span className="font-semibold">Gap:</span> {issue.gap}
            </p>
          ) : null}
          <div className="grid gap-3 text-xs text-ink-600 sm:grid-cols-3">
            <div>
              <p className="font-semibold uppercase tracking-wider text-ink-400">Facts</p>
              <p className="mt-1">{issue.factIds.length} linked</p>
            </div>
            <div>
              <p className="font-semibold uppercase tracking-wider text-ink-400">Evidence</p>
              <p className="mt-1">{issue.evidenceIds.length} linked</p>
            </div>
            <div>
              <p className="font-semibold uppercase tracking-wider text-ink-400">Authorities</p>
              <p className="mt-1">{issue.authorityIds.length} linked</p>
            </div>
          </div>
          <SourceRefs sources={issue.sources} />
        </div>
      )}
    </li>
  );
}
