import { describe, it, expect } from "vitest";
import { assessLegalAid, type LegalAidQuestionnaire } from "@/lib/legal/aid";

const base: LegalAidQuestionnaire = {
  age: 30,
  gender: "prefer_not",
  annualIncome: 500000,
  state: "Delhi",
  disability: false,
  custody: false,
  scheduledCasteOrTribe: false,
  womenOrChild: false,
  industrialWorkman: false,
  victimOfTraffickingOrDisaster: false,
};

describe("assessLegalAid", () => {
  it("marks high-income person as not eligible by default", () => {
    const r = assessLegalAid(base);
    expect(r.possibleEligibility).toBe(false);
    expect(r.needsOfficialConfirmation).toBe(true);
  });

  it("marks income below threshold as eligible", () => {
    const r = assessLegalAid({ ...base, annualIncome: 200000 });
    expect(r.possibleEligibility).toBe(true);
  });

  it("marks women as eligible", () => {
    const r = assessLegalAid({ ...base, gender: "female" });
    expect(r.possibleEligibility).toBe(true);
    expect(r.reasons.some((x) => x.includes("Women"))).toBe(true);
  });

  it("marks SC/ST as eligible", () => {
    const r = assessLegalAid({ ...base, scheduledCasteOrTribe: true });
    expect(r.possibleEligibility).toBe(true);
  });

  it("marks persons in custody as eligible", () => {
    const r = assessLegalAid({ ...base, custody: true });
    expect(r.possibleEligibility).toBe(true);
  });
});
