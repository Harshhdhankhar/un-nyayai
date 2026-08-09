"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, ChevronDown, FileText, LockKeyhole, MapPin, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

type StepStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED" | "NEEDS_INFORMATION";

export interface StrategyStep {
  order: number;
  title: string;
  whyItMatters?: string;
  requiredDocuments: string[];
  estDuration?: string;
  status: StepStatus;
  notes?: string;
}

const stateLabel: Record<StepStatus, string> = {
  NOT_STARTED: "Upcoming",
  IN_PROGRESS: "Current",
  COMPLETED: "Complete",
  BLOCKED: "Blocked",
  NEEDS_INFORMATION: "Needs information",
};

export function StrategySteps({ matterId, instanceId, steps }: { matterId: string; instanceId: string; steps: StrategyStep[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(() => {
    const explicit = steps.find((step) => step.status === "IN_PROGRESS" || step.status === "BLOCKED" || step.status === "NEEDS_INFORMATION");
    return explicit?.order ?? steps.find((step) => step.status !== "COMPLETED")?.order ?? null;
  });
  const inferredCurrent = steps.find((step) => step.status === "IN_PROGRESS")?.order ?? steps.find((step) => step.status !== "COMPLETED")?.order;

  async function update(order: number, status: StepStatus) {
    setBusy(order);
    try {
      const response = await fetch(`/api/matters/${matterId}/routes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId, stepOrder: order, status }),
      });
      if (response.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <ol className="relative">
      {steps.map((step, index) => {
        const displayedStatus = step.status === "NOT_STARTED" && step.order === inferredCurrent ? "IN_PROGRESS" : step.status;
        const open = expanded === step.order;
        return (
          <li key={step.order} className="group relative grid grid-cols-[2.5rem_1fr] gap-4 sm:grid-cols-[7rem_3rem_1fr] sm:gap-5">
            <div className="hidden pt-5 text-right sm:block">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">Stage {String(index + 1).padStart(2, "0")}</span>
            </div>
            <div className="relative flex justify-center">
              {index < steps.length - 1 ? <span className={cn("absolute bottom-0 top-10 w-px", step.status === "COMPLETED" ? "bg-verified-600" : "bg-ink-300")} /> : null}
              <span className={cn(
                "relative z-10 mt-3 grid h-9 w-9 place-items-center rounded-full border-2 bg-paper text-xs font-bold",
                displayedStatus === "COMPLETED" && "border-verified-600 bg-verified-600 text-white",
                displayedStatus === "IN_PROGRESS" && "border-navy-950 bg-paper text-navy-950 ring-4 ring-navy-100",
                displayedStatus === "BLOCKED" && "border-critical-600 bg-critical-100 text-critical-600",
                displayedStatus === "NEEDS_INFORMATION" && "border-amber-600 bg-amber-100 text-amber-700",
                displayedStatus === "NOT_STARTED" && "border-ink-300 text-ink-400"
              )}>
                {displayedStatus === "COMPLETED" ? <Check className="h-4 w-4" /> : displayedStatus === "BLOCKED" ? <LockKeyhole className="h-3.5 w-3.5" /> : displayedStatus === "NEEDS_INFORMATION" ? <AlertCircle className="h-4 w-4" /> : displayedStatus === "IN_PROGRESS" ? <MapPin className="h-4 w-4" /> : index + 1}
              </span>
            </div>
            <div className={cn("mb-5 border bg-white transition-colors", displayedStatus === "IN_PROGRESS" ? "border-navy-900" : "border-ink-200", displayedStatus === "NOT_STARTED" && "bg-paper/60")}>
              <button type="button" aria-expanded={open} onClick={() => setExpanded(open ? null : step.order)} className="flex w-full items-start gap-4 p-4 text-left sm:p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("text-[10px] font-bold uppercase tracking-[0.14em]", displayedStatus === "COMPLETED" ? "text-verified-700" : displayedStatus === "IN_PROGRESS" ? "text-navy-700" : displayedStatus === "BLOCKED" ? "text-critical-600" : displayedStatus === "NEEDS_INFORMATION" ? "text-amber-700" : "text-ink-400")}>{stateLabel[displayedStatus]}</span>
                    {step.estDuration ? <span className="text-[10px] text-ink-400">· {step.estDuration}</span> : null}
                  </div>
                  <h3 className="mt-1.5 font-serif-display text-lg text-navy-950 sm:text-xl">{step.title}</h3>
                  {step.whyItMatters ? <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ink-600">{step.whyItMatters}</p> : null}
                </div>
                <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 text-ink-400 transition-transform", open && "rotate-180")} />
              </button>

              {open ? (
                <div className="border-t border-ink-200 px-4 py-4 sm:px-5">
                  {step.requiredDocuments.length ? (
                    <div>
                      <p className="eyebrow">Relevant documents</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {step.requiredDocuments.map((document) => <span key={document} className="inline-flex items-center gap-1.5 border border-ink-200 bg-paper px-2.5 py-1.5 text-xs text-ink-700"><FileText className="h-3.5 w-3.5" />{document}</span>)}
                      </div>
                    </div>
                  ) : <p className="text-xs text-ink-500">No specific document has been identified for this stage.</p>}
                  {step.notes ? <p className="mt-4 border-l-2 border-amber-500 pl-3 text-sm text-ink-600">{step.notes}</p> : null}
                  <div className="mt-5 flex flex-wrap gap-2">
                    {step.status !== "IN_PROGRESS" && step.status !== "COMPLETED" ? <button disabled={busy === step.order} onClick={() => update(step.order, "IN_PROGRESS")} className="bg-navy-950 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Set as current</button> : null}
                    {step.status !== "COMPLETED" ? <button disabled={busy === step.order} onClick={() => update(step.order, "COMPLETED")} className="border border-verified-600 px-3 py-2 text-xs font-semibold text-verified-700 disabled:opacity-50">Mark complete</button> : <button disabled={busy === step.order} onClick={() => update(step.order, "IN_PROGRESS")} className="inline-flex items-center gap-1.5 border border-ink-200 px-3 py-2 text-xs font-semibold text-ink-600"><RotateCcw className="h-3.5 w-3.5" /> Reopen</button>}
                    {step.status !== "NEEDS_INFORMATION" ? <button disabled={busy === step.order} onClick={() => update(step.order, "NEEDS_INFORMATION")} className="border border-ink-200 px-3 py-2 text-xs font-semibold text-ink-600 disabled:opacity-50">Needs information</button> : null}
                    {step.status !== "BLOCKED" ? <button disabled={busy === step.order} onClick={() => update(step.order, "BLOCKED")} className="border border-ink-200 px-3 py-2 text-xs font-semibold text-ink-600 disabled:opacity-50">Mark blocked</button> : null}
                  </div>
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
