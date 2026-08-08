import { describe, it, expect } from "vitest";
import { computeReadiness } from "@/lib/legal/readiness";

describe("computeReadiness", () => {
  it("returns 0 for an empty matter", () => {
    const r = computeReadiness({
      factCount: 0,
      missingFactCount: 0,
      documentCount: 0,
      eventCount: 0,
      sourceVerifiedCount: 0,
      sourceCount: 0,
      hasNextAction: false,
      missingEvidenceCount: 0,
      availableEvidenceCount: 0,
      hasDeadlineInfo: false,
    });
    expect(r.total).toBe(0);
  });

  it("caps document score at 20", () => {
    const r = computeReadiness({
      factCount: 4,
      missingFactCount: 0,
      documentCount: 10,
      eventCount: 6,
      sourceVerifiedCount: 3,
      sourceCount: 3,
      hasNextAction: true,
      missingEvidenceCount: 0,
      availableEvidenceCount: 3,
      hasDeadlineInfo: true,
    });
    expect(r.documentsAvailable).toBe(20);
  });

  it("gives full marks when everything is complete", () => {
    const r = computeReadiness({
      factCount: 5,
      missingFactCount: 0,
      documentCount: 4,
      eventCount: 6,
      sourceVerifiedCount: 3,
      sourceCount: 3,
      hasNextAction: true,
      missingEvidenceCount: 0,
      availableEvidenceCount: 3,
      hasDeadlineInfo: true,
    });
    expect(r.total).toBe(100);
  });

  it("scales source verification proportionally", () => {
    const r = computeReadiness({
      factCount: 4,
      missingFactCount: 0,
      documentCount: 4,
      eventCount: 6,
      sourceVerifiedCount: 1,
      sourceCount: 4,
      hasNextAction: true,
      missingEvidenceCount: 0,
      availableEvidenceCount: 3,
      hasDeadlineInfo: true,
    });
    expect(r.legalSourceVerification).toBe(3.8);
  });
});
