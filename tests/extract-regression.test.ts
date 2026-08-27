import { describe, it, expect } from "vitest";
import {
  timeframeToDays,
  parseDateLoose,
  extractDates,
  extractDirectives,
} from "@/lib/intelligence/extract";
import { buildSourceCoverage } from "@/lib/workbench/source-coverage";
import type { MatterBundle } from "@/lib/intelligence/inputs";

describe("timeframeToDays", () => {
  it("parses spelled-out single-unit timeframes", () => {
    expect(timeframeToDays("a month")).toBe(30);
    expect(timeframeToDays("a year")).toBe(365);
    expect(timeframeToDays("a week")).toBe(7);
    expect(timeframeToDays("within a day")).toBe(1);
    expect(timeframeToDays("two weeks")).toBe(14);
    expect(timeframeToDays("fortnight")).toBe(14);
    expect(timeframeToDays("three months")).toBe(90);
  });

  it("returns null for phrases with no time unit", () => {
    expect(timeframeToDays("within 30")).toBeNull();
    expect(timeframeToDays("none")).toBeNull();
  });
});

describe("parseDateLoose", () => {
  it("rejects structurally-invalid ISO dates instead of passing them through", () => {
    expect(parseDateLoose("2023-13-99")).toBeNull();
    expect(parseDateLoose("2023-00-10")).toBeNull();
    expect(parseDateLoose("2023-01-40")).toBeNull();
  });

  it("still parses valid ISO, dd/mm/yyyy and dd Mon yyyy", () => {
    expect(parseDateLoose("2024-02-01")).toBe("2024-02-01");
    expect(parseDateLoose("15/04/2026")).toBe("2026-04-15");
    expect(parseDateLoose("15 Apr 2026")).toBe("2026-04-15");
  });
});

describe("extractDirectives timeframe", () => {
  it("resolves a one-month timeframe to 30 days", () => {
    const dirs = extractDirectives("The respondent is directed to file a reply within a month.");
    expect(dirs.length).toBeGreaterThan(0);
    expect(dirs[0].timeframeDays).toBe(30);
  });
});

describe("buildSourceCoverage", () => {
  it("does not crash on a source with an empty type", () => {
    const bundle: MatterBundle = {
      id: "m1", title: "t", description: null, matterType: "civil", category: "civil",
      jurisdiction: null, court: null, cnr: null, status: "pending", readinessScore: null,
      nextAction: null, parties: [], facts: [], events: [], tasks: [], notes: [],
      sources: [{ id: "s1", title: "x", type: "", status: "verified" } as never],
      documents: [], evidence: [], drafts: [], routes: [],
    };
    expect(() => buildSourceCoverage(bundle, null)).not.toThrow();
  });
});

describe("extractDates", () => {
  it("does not emit structurally-invalid ISO dates", () => {
    const found = extractDates("Filing dated 2023-13-99 is invalid.");
    expect(found.some((d) => d.iso === "2023-13-99")).toBe(false);
  });
});
