export function ReadinessBar({
  score,
  showLabel = true,
}: {
  score: number;
  showLabel?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div>
      {showLabel && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-ink-500">Readiness</span>
          <span className="text-xs font-semibold text-ink-900">{clamped}</span>
        </div>
      )}
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-200">
        <div
          className="h-full rounded-full bg-verified-600 transition-all"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-ink-400">
        How prepared your matter is — not a prediction of outcome.
      </p>
    </div>
  );
}
