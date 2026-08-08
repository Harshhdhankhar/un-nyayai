import { describe, it, expect } from "vitest";
import { mergeCaseTimeline, type TimelineItem } from "@/lib/matters/timeline";
import type { CaseSummary } from "@/lib/providers/ecourts/mapper";

const local: TimelineItem[] = [
  { date: "2025-01-01", title: "Signed lease", description: "", source: "user", confidence: 1, editable: true },
];

const caseSummary: CaseSummary = {
  humanSummary: "",
  timeline: [
    { date: "2025-02-01", title: "Case filed", description: "", source: "ecourts", confidence: 1, editable: false },
    { date: "2025-03-01", title: "First hearing", description: "Adjourned", source: "ecourts", confidence: 1, editable: false },
  ],
  currentStageExplanation: "",
  upcomingHearing: { date: null, note: "" },
  whatHappenedLast: "",
  whatToPrepare: [],
  isDemo: true,
};

describe("mergeCaseTimeline", () => {
  it("merges eCourts events with local events", () => {
    const merged = mergeCaseTimeline(local, caseSummary);
    expect(merged).toHaveLength(3);
  });

  it("does not duplicate identical events", () => {
    const duplicate: CaseSummary = {
      ...caseSummary,
      timeline: [
        ...caseSummary.timeline,
        { date: "2025-01-01", title: "Signed lease", description: "", source: "ecourts", confidence: 1, editable: false },
      ],
    };
    const merged = mergeCaseTimeline(local, duplicate);
    expect(merged).toHaveLength(3);
  });

  it("sorts merged events chronologically", () => {
    const merged = mergeCaseTimeline(local, caseSummary);
    const dates = merged.map((i) => i.date);
    expect(dates).toEqual([...dates].sort());
  });
});
