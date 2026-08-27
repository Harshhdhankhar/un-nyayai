import { describe, it, expect } from "vitest";
import { buildEntityLedger, summarizeLedger } from "@/lib/intelligence/entities";
import type { MatterBundle, OrderText } from "@/lib/intelligence/inputs";

const bundle = {} as MatterBundle;
const orders: OrderText[] = [
  { text: "Deposit Rs. 40,000 within two weeks. Next date 15 August 2026. Section 138 NI Act.", date: "2026-07-01", origin: "ecourts", label: "Order A", recordId: "cnr-1" },
  { text: "Deposit Rs. 40,000 again by 27 August 2026. Case No. 138/2024.", date: "2026-08-01", origin: "ecourts", label: "Order B", recordId: "cnr-1" },
];
const facts = ["Advance of Rs. 40,000 was paid to the landlord."];

describe("buildEntityLedger", () => {
  it("normalizes and dedupes amounts, counting mentions across sources", () => {
    const ledger = buildEntityLedger(bundle, orders, facts);
    expect(ledger.amounts.length).toBeGreaterThan(0);
    const top = ledger.amounts[0];
    expect(top.mentions).toBeGreaterThanOrEqual(2);
    expect(top.from.length).toBeGreaterThanOrEqual(2);
  });

  it("extracts and dedupes dates", () => {
    const ledger = buildEntityLedger(bundle, orders, facts);
    expect(ledger.dates.length).toBeGreaterThan(0);
  });

  it("extracts provisions", () => {
    const ledger = buildEntityLedger(bundle, orders, facts);
    expect(ledger.provisions.some((p) => p.value.includes("section 138"))).toBe(true);
  });

  it("extracts case numbers", () => {
    const ledger = buildEntityLedger(bundle, orders, facts);
    expect(ledger.caseNumbers.some((c) => c.value.includes("138/2024"))).toBe(true);
  });

  it("summarizes counts neutrally", () => {
    const s = summarizeLedger(buildEntityLedger(bundle, orders, facts));
    expect(s).toContain("Normalized entities");
    expect(s.toLowerCase()).not.toContain("win");
  });
});