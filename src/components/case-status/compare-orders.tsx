"use client";

import { useMemo, useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { compareOrders, type OrderComparisonDelta } from "@/lib/intelligence/order-compare";

export interface CompareOrderOption {
  key: string;
  label: string;
  text: string;
}

const KIND_LABEL: Record<OrderComparisonDelta["kind"], string> = {
  direction_added: "New direction",
  direction_removed: "Direction no longer present",
  date_changed: "Date changed",
  case_number_added: "Case number added",
  amount_added: "Amount mentioned",
  provision_added: "Provision cited",
  authority_added: "Authority cited",
};

const KIND_TONE: Record<OrderComparisonDelta["kind"], string> = {
  direction_added: "text-amber-800 bg-amber-100",
  direction_removed: "text-ink-600 bg-ink-100",
  date_changed: "text-navy-800 bg-navy-100",
  case_number_added: "text-ink-700 bg-ink-100",
  amount_added: "text-amber-800 bg-amber-100",
  provision_added: "text-navy-800 bg-navy-100",
  authority_added: "text-navy-800 bg-navy-100",
};

export function CompareOrders({ options }: { options: CompareOrderOption[] }) {
  const [aKey, setAKey] = useState(options[0]?.key ?? "");
  const [bKey, setBKey] = useState(options[1]?.key ?? "");

  const result = useMemo(() => {
    const a = options.find((o) => o.key === aKey);
    const b = options.find((o) => o.key === bKey);
    if (!a || !b || a.key === b.key) return null;
    return compareOrders(
      { text: a.text, date: null, origin: "ecourts", label: a.label, recordId: a.key },
      { text: b.text, date: null, origin: "ecourts", label: b.label, recordId: b.key }
    );
  }, [options, aKey, bKey]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs">
          <span className="mb-1 block font-semibold text-ink-600">Earlier order</span>
          <select value={aKey} onChange={(e) => setAKey(e.target.value)} className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900">
            {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </label>
        <label className="block text-xs">
          <span className="mb-1 block font-semibold text-ink-600">Newer order</span>
          <select value={bKey} onChange={(e) => setBKey(e.target.value)} className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900">
            {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </label>
      </div>

      {result && (
        <div className="border-t border-ink-200 pt-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-navy-950"><ArrowRightLeft className="h-4 w-4 text-navy-700" /> Comparison</p>
          <p className="mt-1 text-xs text-ink-600">{result.summary}</p>
          {result.deltas.length ? (
            <ul className="mt-3 space-y-2">
              {result.deltas.map((d, i) => (
                <li key={i} className="rounded-md border border-ink-200 p-2.5">
                  <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${KIND_TONE[d.kind]}`}>{KIND_LABEL[d.kind]}</span>
                  <p className="mt-1.5 text-sm text-ink-800">
                    {d.kind === "direction_removed"
                      ? <span className="line-through opacity-70">{d.before}</span>
                      : <span className="font-medium">{d.after ?? d.before}</span>}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-4 text-ink-500">{d.note}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-500">No material differences detected.</p>
          )}
        </div>
      )}
    </div>
  );
}