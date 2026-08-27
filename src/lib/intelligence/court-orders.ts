/* =========================================================================
 * Court Order Intelligence.
 *
 * Reads directions out of court-order text (uploaded orders + cached eCourts
 * orders/history) and turns each into a CourtDirection with an EXPLICIT
 * verification status. Derived deadlines are always labelled NEEDS_VERIFICATION
 * — a timeframe read from prose ("within two weeks") is a starting point for the
 * user to confirm, never an authoritative due date. Compliance is inferred only
 * from concrete task state, and stays "unknown" when it genuinely can't be told.
 * ========================================================================= */

import type { CourtDirection, SourceRef } from "./types";
import type { OrderText, TaskRow } from "./inputs";
import { extractDirectives } from "./extract";

/** Add a number of days to an ISO (yyyy-mm-dd) date. */
function addDaysISO(iso: string, days: number): string | null {
  const base = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) return null;
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

const COMPLIANCE_KEYWORDS = [
  "reply",
  "counter",
  "affidavit",
  "rejoinder",
  "document",
  "evidence",
  "appear",
  "deposit",
  "pay",
  "produce",
  "furnish",
  "submit",
  "file",
];

function inferCompliance(directiveText: string, tasks: TaskRow[]): CourtDirection["compliance"] {
  const lower = directiveText.toLowerCase();
  const salient = COMPLIANCE_KEYWORDS.filter((k) => lower.includes(k));
  if (salient.length === 0) return "unknown";
  const doneText = tasks
    .filter((t) => t.status === "done")
    .map((t) => `${t.title} ${t.description ?? ""}`.toLowerCase());
  if (doneText.length === 0) return "pending";
  const done = doneText.some((t) => salient.some((k) => t.includes(k)));
  return done ? "possibly_done" : "pending";
}

function orderRef(order: OrderText): SourceRef {
  if (order.origin === "ecourts") {
    return { kind: "ecourts", label: order.label, field: "order", recordId: order.recordId };
  }
  return { kind: "document", label: order.label, recordId: order.recordId, passage: undefined };
}

export function analyseCourtOrders(orders: OrderText[], tasks: TaskRow[] = []): CourtDirection[] {
  const out: CourtDirection[] = [];
  let seq = 0;
  const seen = new Set<string>();

  for (const order of orders) {
    const ref = orderRef(order);
    const directives = extractDirectives(order.text);
    for (const d of directives) {
      const key = d.text.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      seq += 1;

      let deadline: CourtDirection["deadline"];
      if (d.timeframeDays !== null) {
        const dueDate = order.date ? addDaysISO(order.date, d.timeframeDays) : null;
        deadline = {
          dueDate,
          basis: order.date
            ? `${d.timeframe} from the order dated ${order.date}. Derived — confirm against the order and any extensions.`
            : `Order states "${d.timeframe}", but the order date is not recorded, so an exact due date cannot be computed.`,
          status: "NEEDS_VERIFICATION",
        };
      }

      out.push({
        id: `dir-${seq}`,
        text: d.text,
        addressee: d.addressee,
        deadline,
        source: { ...ref, passage: d.text },
        compliance: inferCompliance(d.text, tasks),
      });
    }
  }

  return out;
}
