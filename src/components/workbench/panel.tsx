export function Panel({
  eyebrow,
  title,
  description,
  children,
  actions,
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-ink-200 bg-white">
      {(eyebrow || title || actions) && (
        <header className="flex items-end justify-between gap-4 border-b border-ink-200 px-5 py-4">
          <div>
            {eyebrow ? <p className="eyebrow text-navy-700">{eyebrow}</p> : null}
            {title ? <h3 className="mt-1 font-serif-display text-xl text-navy-950">{title}</h3> : null}
            {description ? <p className="mt-1 text-sm leading-6 text-ink-500">{description}</p> : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
