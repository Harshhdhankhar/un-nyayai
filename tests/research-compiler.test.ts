import { describe, it, expect } from "vitest";
import {
  compileResearchIntent,
  rankAuthorities,
} from "@/lib/intelligence/research-compiler";
import type { KanoonSearchResult } from "@/lib/providers/indian-kanoon/types";

describe("research compiler", () => {
  it("compiles a structured query instead of the raw question", () => {
    const intent = compileResearchIntent(
      "recent Supreme Court judgments on cheque bounce under section 138"
    );
    expect(intent.provisions).toContain("Section 138");
    expect(intent.legalConcepts).toContain("cheque bounce");
    expect(intent.court).toBe("Supreme Court of India");
    expect(intent.compiledQuery).toContain("Section 138");
    expect(intent.compiledQuery).not.toContain("recent Supreme Court judgments on");
  });

  it("detects court from matter context and text", () => {
    const viaCtx = compileResearchIntent("wrongful termination of employment", {
      court: "Delhi High Court",
    });
    expect(viaCtx.court).toBe("Delhi High Court");
    expect(viaCtx.humanQuery).toContain("Delhi High Court");
    expect(viaCtx.compiledQuery).toContain("wrongful termination");
  });

  it("extracts a quoted search phrase verbatim", () => {
    const intent = compileResearchIntent('find cases on "specific performance"');
    expect(intent.searchPhrases).toContain("specific performance");
    expect(intent.compiledQuery).toContain('"specific performance"');
  });

  it("derives a recency date range from 'last N years'", () => {
    const intent = compileResearchIntent("maintenance judgments in the last 3 years");
    expect(intent.fromDate).toMatch(/^\d{4}-01-01$/);
    expect(intent.toDate).toMatch(/^\d{4}-12-31$/);
    expect(intent.humanQuery).toContain("last 3 years");
  });

  it("falls back to a cleaned topic when nothing structured is found", () => {
    const intent = compileResearchIntent("please find judgments about eviction");
    expect(intent.compiledQuery).toBe("eviction");
  });
});

function hit(partial: Partial<KanoonSearchResult> & { tid: number }): KanoonSearchResult {
  return {
    tid: partial.tid,
    title: partial.title ?? "",
    date: partial.date ?? "2024-01-01",
    citation: partial.citation ?? "",
    head: partial.head ?? "",
    source: partial.source ?? "",
    excerpt: partial.excerpt ?? "",
    numCites: partial.numCites ?? 0,
    numCitedBy: partial.numCitedBy ?? 0,
  };
}

describe("rankAuthorities (query-fit relevance)", () => {
  const intent = compileResearchIntent(
    "Supreme Court judgments on cheque bounce under section 138"
  );

  it("ranks higher a result matching the query concepts", () => {
    const results = [
      hit({
        tid: 1,
        title: "Cheque bounce under Section 138 NI Act",
        excerpt: "cheque bounce dishonour recovery",
        source: "Supreme Court of India",
        numCitedBy: 120,
        date: "2023-05-01",
      }),
      hit({ tid: 2, title: "Criminal procedure quashing FIR", excerpt: "quashing", date: "2020-01-01" }),
    ];
    const ranked = rankAuthorities(results, intent);
    expect(ranked[0].tid).toBe(1);
    expect(ranked[0].relevance).toBeGreaterThan(ranked[1].relevance);
  });

  it("never exceeds 100 and is labelled as query-fit, not strength", () => {
    const results = [
      hit({
        tid: 1,
        title: "cheque bounce section 138 ni act cheque bounce",
        excerpt: "cheque bounce dishonour cheque",
        source: "Supreme Court of India",
        numCitedBy: 500,
        date: "2024-01-01",
      }),
    ];
    const ranked = rankAuthorities(results, intent);
    expect(ranked[0].relevance).toBeLessThanOrEqual(100);
    expect(ranked[0].relevance).toBeGreaterThan(0);
    expect(
      ranked[0].signals.some((s) => s.label.includes("query terms"))
    ).toBe(true);
  });
});
