export function SourcesTicker() {
  const badges = [
    { name: "Supreme Court of India", type: "e-SCR Registry" },
    { name: "National Judicial Data Grid", type: "Live NJDG Sync" },
    { name: "25 High Courts", type: "State Cause Lists" },
    { name: "680+ District Courts", type: "Daily Orders" },
    { name: "Gazette of India", type: "BNS / BSA (2023)" },
    { name: "Open Peeps Avatars", type: "CC0 Pablo Stanley" },
  ];

  return (
    <div className="border-t border-border bg-[#f8f6f0] px-6 py-6 text-xs">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Connected to official public registries</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-muted-foreground font-mono text-[11px]">
          {badges.map((b, i) => (
            <span key={i} className="hover:text-foreground transition-colors cursor-default">
              {b.name} <span className="opacity-40">·</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
