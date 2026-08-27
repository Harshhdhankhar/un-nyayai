export default function AppLoading() {
  return (
    <div className="workspace-page" aria-busy="true" aria-label="Loading workspace">
      <div className="h-3 w-28 animate-pulse bg-ink-200" />
      <div className="mt-5 h-12 max-w-xl animate-pulse bg-ink-200" />
      <div className="mt-10 grid gap-px bg-ink-200 sm:grid-cols-2">
        <div className="h-52 animate-pulse bg-white" />
        <div className="h-52 animate-pulse bg-white" />
      </div>
    </div>
  );
}
