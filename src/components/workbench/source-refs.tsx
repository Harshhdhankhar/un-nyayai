"use client";

import { useState } from "react";
import {
  FileText,
  Landmark,
  BookOpen,
  Scale,
  User,
  Cpu,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SourceRef } from "@/lib/workbench/types";

const KIND_META: Record<SourceRef["kind"], { label: string; icon: typeof FileText; tone: string }> = {
  user: { label: "User provided", icon: User, tone: "text-ink-500" },
  document: { label: "Document", icon: FileText, tone: "text-navy-700" },
  ecourts: { label: "eCourts", icon: Landmark, tone: "text-amber-600" },
  indian_kanoon: { label: "Indian Kanoon", icon: BookOpen, tone: "text-navy-700" },
  verified_rule: { label: "Statute / rule", icon: Scale, tone: "text-verified-700" },
  system: { label: "System", icon: Cpu, tone: "text-ink-400" },
};

/**
 * Compact source references for a claim/statement. Each shows its kind and
 * label; clicking reveals the passage/page/url in an inline disclosure so any
 * NyayAI statement is inspectable back to its origin.
 */
export function SourceRefs({ sources }: { sources: SourceRef[] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {sources.map((s, i) => {
        const meta = KIND_META[s.kind] ?? KIND_META.system;
        const Icon = meta.icon;
        return (
          <SourceChip key={i} source={s} meta={meta} Icon={Icon} />
        );
      })}
    </div>
  );
}

function SourceChip({
  source,
  meta,
  Icon,
}: {
  source: SourceRef;
  meta: { label: string; icon: typeof FileText; tone: string };
  Icon: typeof FileText;
}) {
  const [open, setOpen] = useState(false);
  const hasDetail = Boolean(source.passage) || Boolean(source.page) || Boolean(source.url);
  return (
    <div className="inline-flex flex-col">
      <button
        type="button"
        onClick={() => hasDetail && setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[11px] font-medium text-ink-600 transition-colors",
          hasDetail && "hover:border-navy-700 hover:text-navy-800"
        )}
        title={meta.label}
      >
        <Icon className={cn("h-3 w-3", meta.tone)} />
        {source.label}
        {source.field ? <span className="text-ink-400">· {source.field}</span> : null}
        {source.url ? <ExternalLink className="h-2.5 w-2.5 text-ink-400" /> : null}
      </button>
      {open && (
        <div className="mt-1 rounded-md border border-ink-200 bg-ink-50/70 p-2 text-[11px] leading-5 text-ink-600">
          {source.passage ? (
            <p className="italic">“{source.passage}”</p>
          ) : null}
          {source.page ? <p>Page {source.page}</p> : null}
          {source.url ? (
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-navy-700 underline"
            >
              Open source <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}
