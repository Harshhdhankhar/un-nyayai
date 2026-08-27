import type { ReadinessComponents } from "@/lib/legal/readiness";

const labels: Array<[keyof ReadinessComponents, string, number]> = [
  ["factsCompleteness", "Facts", 20],
  ["documentsAvailable", "Documents", 20],
  ["timelineCompleteness", "Timeline", 15],
  ["legalSourceVerification", "Verified research", 15],
  ["nextActionIdentified", "Next action", 15],
  ["missingEvidenceAddressed", "Evidence", 10],
  ["deadlineInformation", "Deadlines", 5],
];

export function ReadinessSummary({ readiness }: { readiness: ReadinessComponents }) {
  return (
    <section className="border border-ink-200 bg-white p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-navy-700">Matter readiness</p>
          <p className="mt-2 text-xs leading-5 text-ink-500">Preparation completeness, not predicted success.</p>
        </div>
        <strong className="font-serif-display text-3xl font-normal text-navy-950">{Math.round(readiness.total)}<span className="text-base text-ink-400">/100</span></strong>
      </div>
      <div className="mt-5 h-1.5 bg-ink-100" aria-hidden="true">
        <div className="h-full bg-verified-600" style={{ width: `${readiness.total}%` }} />
      </div>
      <dl className="mt-5 space-y-2.5">
        {labels.map(([key, label, maximum]) => (
          <div key={key} className="flex items-center justify-between gap-3 text-xs">
            <dt className="text-ink-600">{label}</dt>
            <dd className={readiness[key] === maximum ? "text-verified-700" : "text-ink-500"}>{readiness[key]} / {maximum}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
