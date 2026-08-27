import { describe, it, expect } from "vitest";
import { analyzeHearings, explainDelayPattern, normalizeDelayReason, taxonomizeHearings } from "@/lib/legal/delay-analysis";
import type { ECourtHearing } from "@/lib/providers/ecourts/types";

function h(date: string, purpose: string, result = ""): ECourtHearing {
  return { hearingDate: date, purpose, result, orderSummary: "" };
}

describe("analyzeHearings V2", () => {
  it("computes a median gap that resists outlier skew", () => {
    // gaps: 30, 30, 30, 400  → average = 122.5, median = 30
    const analysis = analyzeHearings([
      h("2025-01-01", "Hearing", "Adjourned"),
      h("2025-01-31", "Hearing", "Adjourned"),
      h("2025-03-02", "Hearing", "Adjourned"),
      h("2025-04-01", "Hearing", "Adjourned"),
      h("2026-05-06", "Hearing", "Adjourned"),
    ]);
    expect(analysis.averageGap).toBeGreaterThan(analysis.medianGap!);
    expect(analysis.medianGap).toBe(30);
  });

  it("reports time pending as the span between first and last hearing", () => {
    const analysis = analyzeHearings([h("2025-01-01", "H"), h("2025-07-01", "H")]);
    expect(analysis.timePendingDays).toBe(181);
  });

  it("counts by reason and attribution", () => {
    const analysis = analyzeHearings([
      h("2025-01-01", "Hearing", "Time sought"),
      h("2025-02-01", "Arguments", "Part heard"),
    ]);
    expect(analysis.byReason["time sought"]).toBe(1);
    expect(analysis.byReason["substantive hearing"]).toBe(1);
    expect(analysis.attribution.known).toBe(2);
    expect(analysis.attribution.unknown).toBe(0);
  });

  it("returns null median/longest when there are no gaps", () => {
    const analysis = analyzeHearings([h("2025-01-01", "H")]);
    expect(analysis.medianGap).toBeNull();
    expect(analysis.longestGap).toBeNull();
  });

  it("parses Indian dd/mm/yyyy dates as day-first, not US mm/dd/yyyy", () => {
    // Regression: Date.parse("03/04/2026") reads US mm/dd/yyyy (March 4),
    // swapping the Indian dd/mm/yyyy date (April 3) and corrupting gaps.
    const analysis = analyzeHearings([
      h("01/04/2026", "Hearing", "Adjourned"),
      h("15/04/2026", "Hearing", "Adjourned"),
      h("20/04/2026", "Hearing", "Adjourned"),
    ]);
    // True day gaps: 14, 5 → average 9.5 → rounds to 10 (not a March misparse).
    expect(analysis.averageGap).toBe(10);
    expect(analysis.medianGap).toBe(10);
  });

  it("still parses ISO dates and dash dd-mm-yyyy correctly", () => {
    const iso = analyzeHearings([h("2026-01-01", "H"), h("2026-02-01", "H")]);
    expect(iso.averageGap).toBe(31);
    const dash = analyzeHearings([h("01-01-2026", "H"), h("03-01-2026", "H")]);
    expect(dash.averageGap).toBe(2);
  });
});

describe("delay reason taxonomy", () => {
  it("normalizes classified reasons to stable machine labels", () => {
    expect(normalizeDelayReason("time sought")).toBe("PARTY_REQUESTED_TIME");
    expect(normalizeDelayReason("court unavailable")).toBe("COURT_UNAVAILABLE");
    expect(normalizeDelayReason("reason unclear")).toBe("ADJOURNED_WITHOUT_CLEAR_REASON");
    expect(normalizeDelayReason("substantive hearing")).toBe("SUBSTANTIVE_PROGRESS");
  });

  it("taxonomizes each hearing while preserving the original wording", () => {
    const hearings = taxonomizeHearings([h("2025-01-01", "Hearing", "Time sought by parties")]);
    expect(hearings[0].taxonomy).toBe("PARTY_REQUESTED_TIME");
    expect(hearings[0].result).toBe("Time sought by parties");
  });
});

describe("explainDelayPattern", () => {
  it("names repeated requests for time from the record", () => {
    const analysis = analyzeHearings([
      h("2025-01-01", "H", "Time sought"),
      h("2025-02-01", "H", "Time sought"),
      h("2025-03-01", "H", "Time sought"),
      h("2025-04-01", "H", "Time sought"),
    ]);
    const explanation = explainDelayPattern(analysis);
    expect(explanation).toContain("request for time");
  });

  it("explains evidence-stage stagnation when recent hearings stall", () => {
    const analysis = analyzeHearings([
      h("2025-01-01", "Recording of evidence", "Adjourned"),
      h("2025-02-01", "Evidence", "Adjourned"),
      h("2025-03-01", "Evidence", "Adjourned"),
      h("2025-04-01", "Evidence", "Adjourned"),
    ]);
    expect(explainDelayPattern(analysis)).toContain("last 4 recorded hearings");
  });

  it("returns null for an empty record", () => {
    expect(explainDelayPattern(analyzeHearings([]))).toBeNull();
  });
});