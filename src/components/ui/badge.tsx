import { cn } from "@/lib/utils";

type BadgeTone = "navy" | "slate" | "green" | "amber" | "red" | "outline";

const tones: Record<BadgeTone, string> = {
  navy: "bg-navy-100 text-navy-800",
  slate: "bg-ink-100 text-ink-700",
  green: "bg-verified-100 text-verified-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-critical-100 text-critical-600",
  outline: "border border-ink-200 text-ink-500",
};

export function Badge({
  tone = "slate",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}

/** Verification status badge used across responses and sources. */
export function VerificationBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const normalized = status.toLowerCase();
  if (normalized === "verified") {
    return (
      <Badge tone="green" className={className}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" /> Verified
      </Badge>
    );
  }
  if (normalized === "interpretation") {
    return (
      <Badge tone="amber" className={className}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" /> Interpretation
      </Badge>
    );
  }
  return (
    <Badge tone="red" className={className}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" /> Needs verification
    </Badge>
  );
}
