export default function MatterLoading() {
  return (
    <div className="workspace-page !max-w-[96rem]" aria-busy="true" aria-label="Loading matter">
      <div className="mb-6">
        <div className="h-3 w-24 animate-pulse bg-ink-200" />
        <div className="mt-4 h-10 max-w-2xl animate-pulse bg-ink-200" />
        <div className="mt-3 h-4 w-64 animate-pulse bg-ink-200" />
      </div>
      <div className="flex gap-2 border-b border-ink-200 pb-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-6 w-20 animate-pulse bg-ink-200" />
        ))}
      </div>
      <div className="mt-8 grid gap-px bg-ink-200 lg:grid-cols-[1.6fr_1fr]">
        <div className="h-80 animate-pulse bg-white" />
        <div className="h-80 animate-pulse bg-white" />
      </div>
    </div>
  );
}
