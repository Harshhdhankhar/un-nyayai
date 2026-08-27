"use client";

import { cn } from "@/lib/utils";
import type { UncertaintyStatus } from "@/lib/workbench/types";

const TONES: Record<UncertaintyStatus, string> = {
  VERIFIED: "bg-verified-100 text-verified-700",
  DOCUMENT_SUPPORTED: "bg-navy-100 text-navy-800",
  COURT_RECORD: "bg-amber-100 text-amber-700",
  USER_PROVIDED: "bg-ink-100 text-ink-700",
  INTERPRETATION: "bg-amber-100 text-amber-700",
  CONFLICTING: "bg-critical-100 text-critical-600",
  MISSING: "bg-critical-100 text-critical-600",
  UNKNOWN: "border border-ink-200 text-ink-500",
};

const LABELS: Record<UncertaintyStatus, string> = {
  VERIFIED: "Verified",
  DOCUMENT_SUPPORTED: "Document supported",
  COURT_RECORD: "Court record",
  USER_PROVIDED: "User provided",
  INTERPRETATION: "Interpretation",
  CONFLICTING: "Conflicting",
  MISSING: "Missing",
  UNKNOWN: "Unknown",
};

/**
 * Badge for the extended uncertainty vocabulary. Describes information
 * coverage, never a prediction of legal outcome.
 */
export function UncertaintyBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const key = status.toUpperCase() as UncertaintyStatus;
  const label = LABELS[key] ?? status;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        TONES[key] ?? TONES.UNKNOWN,
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
