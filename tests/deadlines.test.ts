import { describe, it, expect } from "vitest";
import { applyDeadlineRule } from "@/lib/legal/deadlines";

const rule = {
  triggerEvent: "salary_non_payment",
  action: "Claim wages",
  duration: 6,
  durationUnit: "months",
  statute: "Payment of Wages Act, 1936",
  section: "15",
  source: "test",
  exceptions: null,
  isLimitationBar: false,
};

describe("applyDeadlineRule", () => {
  it("adds months correctly", () => {
    const r = applyDeadlineRule(rule, new Date("2025-01-15T00:00:00Z"));
    expect(r.dueDate).toBe("2025-07-15");
    expect(r.isLimitationBar).toBe(false);
  });

  it("adds days for day-based rules", () => {
    const r = applyDeadlineRule(
      { ...rule, duration: 90, durationUnit: "days" },
      new Date("2025-01-01T00:00:00Z")
    );
    expect(r.dueDate).toBe("2025-04-01");
  });

  it("adds years for year-based rules", () => {
    const r = applyDeadlineRule(
      { ...rule, duration: 3, durationUnit: "years", isLimitationBar: true },
      new Date("2024-06-10T00:00:00Z")
    );
    expect(r.dueDate).toBe("2027-06-10");
    expect(r.isLimitationBar).toBe(true);
  });

  it("produces a traceable calculation string", () => {
    const r = applyDeadlineRule(rule, new Date("2025-01-15T00:00:00Z"));
    expect(r.calculation).toContain("2025-01-15");
    expect(r.calculation).toContain("Payment of Wages Act, 1936");
    expect(r.calculation).toContain("s.15");
    expect(r.calculation).toContain("2025-07-15");
  });
});
