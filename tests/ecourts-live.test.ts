import "dotenv/config";
import { describe, it, expect } from "vitest";
import {
  lookupCaseByCnr,
  searchCases,
  checkEcourtsHealth,
} from "@/lib/providers/ecourts";

const hasKey = Boolean(process.env.ECOURTS_API_KEY);

// DLHC010001232024 is a real Delhi HC writ petition used in the API docs.
const SAMPLE_CNR = "DLHC010001232024";

describe.runIf(hasKey)("eCourts live API", () => {
  it("health returns live", async () => {
    const h = await checkEcourtsHealth();
    expect(h.mode).toBe("live");
  });

  it("looks up a real case by CNR", async () => {
    const { caseData, mode } = await lookupCaseByCnr(SAMPLE_CNR);
    expect(mode).toBe("live");
    expect(caseData.isDemo).toBe(false);
    expect(caseData.record.caseStatus).toMatch(/pending|disposed/);
    expect(caseData.record.caseType.length).toBeGreaterThan(0);
  });

  it("searches real cases with facets", async () => {
    const { results, mode } = await searchCases({
      courtCodes: "DLHC01",
      caseTypes: "WP_C",
      filingYears: "2024",
      query: "138/2024",
    });
    expect(mode).toBe("live");
    expect(results.results.length).toBeGreaterThan(0);
    expect(results.results[0].cnr.length).toBeGreaterThan(0);
  });
});
