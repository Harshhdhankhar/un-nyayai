"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type StepStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED" | "NEEDS_INFORMATION";

const statusTones: Record<StepStatus, string> = {
  NOT_STARTED: "bg-ink-100 text-ink-600",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-verified-100 text-verified-700",
  BLOCKED: "bg-critical-100 text-critical-600",
  NEEDS_INFORMATION: "bg-navy-100 text-navy-800",
};

export interface StrategyStep {
  order: number;
  title: string;
  whyItMatters?: string;
  requiredDocuments: string[];
  estDuration?: string;
  status: StepStatus;
  notes?: string;
}

export function StrategySteps({
  matterId,
  instanceId,
  steps,
}: {
  matterId: string;
  instanceId: string;
  steps: StrategyStep[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function update(order: number, status: StepStatus) {
    setBusy(String(order));
    try {
      await fetch(`/api/matters/${matterId}/routes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId, stepOrder: order, status }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <ol className="relative space-y-4 border-l-2 border-ink-200 pl-6">
      {steps.map((step) => (
        <li key={step.order} className="relative">
          <span
            className={cn(
              "absolute -left-[1.68rem] top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold",
              step.status === "COMPLETED"
                ? "bg-verified-600 text-white"
                : "bg-white text-ink-600 ring-1 ring-ink-300"
            )}
          >
            {step.status === "COMPLETED" ? "✓" : step.order}
          </span>
          <div className="rounded-md border border-ink-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-ink-900">{step.title}</p>
                {step.whyItMatters && (
                  <p className="mt-0.5 text-xs text-ink-500">{step.whyItMatters}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {step.requiredDocuments.map((d) => (
                    <span key={d} className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] text-ink-600">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", statusTones[step.status])}>
                {step.status.replaceAll("_", " ")}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "BLOCKED", "NEEDS_INFORMATION"] as StepStatus[])
                .filter((s) => s !== step.status)
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={busy === String(step.order)}
                    onClick={() => update(step.order, s)}
                    className="rounded-md border border-ink-200 px-2 py-1 text-[11px] text-ink-600 transition-colors hover:border-navy-700 hover:text-navy-800 disabled:opacity-50"
                  >
                    {s.replaceAll("_", " ")}
                  </button>
                ))}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
