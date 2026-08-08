import { describe, it, expect } from "vitest";
import { chunkText, extractEntities, inferKind } from "@/lib/documents/service";

describe("chunkText", () => {
  it("splits long text into bounded chunks", () => {
    const long = Array.from({ length: 60 }, (_, i) => `Paragraph ${i} with some content words.`).join("\n\n");
    const chunks = chunkText(long, 200, 40);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(400);
    }
  });

  it("returns empty array for empty input", () => {
    expect(chunkText("")).toEqual([]);
  });

  it("keeps short text as a single chunk", () => {
    expect(chunkText("A short agreement.", 800)).toHaveLength(1);
  });
});

describe("extractEntities", () => {
  it("extracts amounts, dates, sections", () => {
    const entities = extractEntities(
      "The rent is Rs. 40,000 per month. Paid on 15 Jan 2025. Under Section 12 of the act."
    );
    const kinds = entities.map((e) => e.kind);
    expect(kinds).toContain("amount");
    expect(kinds).toContain("date");
    expect(kinds).toContain("section");
  });

  it("detects CNR-like case numbers", () => {
    const entities = extractEntities("CNR DLND020000012024 pending");
    expect(entities.some((e) => e.kind === "case_number")).toBe(true);
  });
});

describe("inferKind", () => {
  it("infers notice documents", () => {
    expect(inferKind("legal_notice_final.pdf")).toBe("legal_notice");
  });
  it("infers FIR documents", () => {
    expect(inferKind("fir_copy.pdf")).toBe("fir");
  });
  it("falls back to other", () => {
    expect(inferKind("scan123.pdf")).toBe("other");
  });
});
