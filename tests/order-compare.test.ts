import { describe, it, expect } from "vitest";
import { compareOrders, extractOrderFacts } from "@/lib/intelligence/order-compare";
import type { OrderText } from "@/lib/intelligence/inputs";

const orderA: OrderText = {
  text: "Respondent directed to file reply within two weeks. Next date 15 August 2026. Section 138 NI Act. 2024 2 SCC 100.",
  date: "2026-07-01",
  origin: "document",
  label: "Order A",
  recordId: "doc-a",
};
const orderB: OrderText = {
  text: "Respondent directed to file reply within two weeks and counter affidavit. Amount Rs. 40,000 to be deposited. Next date 27 August 2026. Case No. 138/2024. Section 138 NI Act.",
  date: "2026-08-01",
  origin: "document",
  label: "Order B",
  recordId: "doc-b",
};

describe("extractOrderFacts", () => {
  it("extracts directions, dates, provisions, authorities, case numbers", () => {
    const f = extractOrderFacts(orderA);
    expect(f.directions.length).toBeGreaterThan(0);
    expect(f.dates.some((d) => d === "2026-08-15")).toBe(true);
    expect(f.provisions).toContain("section 138");
    expect(f.authorities.some((x) => x.includes("2024 2 SCC 100"))).toBe(true);
  });
});

describe("compareOrders", () => {
  it("detects a new direction added in the newer order", () => {
    const c = compareOrders(orderA, orderB);
    const added = c.deltas.filter((d) => d.kind === "direction_added");
    expect(added.some((d) => d.after?.includes("counter affidavit"))).toBe(true);
  });

  it("detects an amount and case number added", () => {
    const c = compareOrders(orderA, orderB);
    expect(c.deltas.some((d) => d.kind === "amount_added" && d.after?.includes("40,000"))).toBe(true);
    expect(c.deltas.some((d) => d.kind === "case_number_added")).toBe(true);
  });

  it("detects a next-date change", () => {
    const c = compareOrders(orderA, orderB);
    expect(c.nextDate.a).toBe("2026-08-15");
    expect(c.nextDate.b).toBe("2026-08-27");
    expect(c.deltas.some((d) => d.kind === "date_changed")).toBe(true);
  });

  it("does not treat a shared provision as a change", () => {
    const c = compareOrders(orderA, orderB);
    expect(c.deltas.some((d) => d.kind === "provision_added")).toBe(false);
  });

  it("produces a neutral summary", () => {
    const c = compareOrders(orderA, orderB);
    expect(c.summary.length).toBeGreaterThan(0);
    expect(c.summary.toLowerCase()).not.toContain("win");
  });
});