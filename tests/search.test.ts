import { describe, it, expect } from "vitest";
import { searchMatter } from "@/lib/workbench/search";
import type { MatterBundle } from "@/lib/intelligence/inputs";

const bundle = {
  id: "m-1",
  title: "Rental dispute",
  category: "civil",
  matterType: "civil",
  cnr: null,
  status: "open",
  court: null,
  jurisdiction: null,
  description: "Dispute over unpaid rent.",
  facts: [
    { id: "f1", fact: "Tenant paid rent until March 2025", provenance: "user" as const, sourceId: null, updatedAt: "2025-01-01" },
    { id: "f2", fact: "Advance of Rs. 2,00,000 was paid", provenance: "document" as const, sourceId: null, updatedAt: "2025-01-01" },
  ],
  events: [],
  tasks: [],
  notes: [],
  sources: [{ id: "s1", title: "Rental agreement", type: "judgment", authority: null, citation: null, url: null, excerpt: "rent payable monthly", status: "verified" }],
  documents: [],
  evidence: [],
  drafts: [],
  orders: [],
  history: [],
} as unknown as MatterBundle;

describe("searchMatter", () => {
  it("finds matching facts by keyword", () => {
    const r = searchMatter(bundle, "rent");
    const facts = r.groups.find((g) => g.group === "FACTS");
    expect(facts?.items.length).toBeGreaterThan(0);
  });

  it("returns no groups for a non-matching query", () => {
    const r = searchMatter(bundle, "zzzzznomatch");
    expect(r.total).toBe(0);
  });

  it("returns empty when the query is blank", () => {
    const r = searchMatter(bundle, "   ");
    expect(r.total).toBe(0);
  });

  it("groups results by type", () => {
    const r = searchMatter(bundle, "agreement");
    expect(r.groups.some((g) => g.group === "DOCUMENTS" || g.group === "RESEARCH")).toBe(true);
  });
});