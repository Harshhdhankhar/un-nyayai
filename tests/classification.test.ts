import { describe, it, expect } from "vitest";
import { classifyByKeywords } from "@/lib/legal/classification";

describe("classifyByKeywords", () => {
  it("classifies unpaid salary as employment", () => {
    const r = classifyByKeywords("My employer hasn't paid my salary for 3 months");
    expect(r.category).toBe("employment");
    expect(r.subCategory).toBe("unpaid_salary");
  });

  it("classifies security deposit as property", () => {
    const r = classifyByKeywords("Landlord kept my security deposit after I moved out");
    expect(r.category).toBe("property");
    expect(r.subCategory).toBe("security_deposit");
  });

  it("classifies a refund issue as consumer", () => {
    const r = classifyByKeywords("The seller refused to refund me for a defective product");
    expect(r.category).toBe("consumer");
  });

  it("classifies UPI fraud as cyber", () => {
    const r = classifyByKeywords("Money was deducted from my bank account via a UPI scam");
    expect(r.category).toBe("cyber");
  });

  it("classifies cheque bounce as civil", () => {
    const r = classifyByKeywords("My cheque bounced and money is owed to me");
    expect(r.category).toBe("civil");
  });

  it("falls back to other for unrelated input", () => {
    const r = classifyByKeywords("I love cooking on weekends");
    expect(r.category).toBe("other");
  });
});

/**
 * Regression: the classifier used to take the single highest-weighted keyword
 * match, so one incidental long word in an earlier-listed category decided the
 * outcome. The word "registered" in the criminal keyword list made every
 * question about a *registered* lease a "criminal matter" whose recommended
 * next step was "FIR / police complaint".
 */
describe("classifyByKeywords — no single keyword may hijack a category", () => {
  const leaseQuery =
    "Can a landlord terminate a registered lease with 48 hours notice under Section 106 TPA?";

  it("routes a registered-lease / Section 106 TPA question to property, not criminal", () => {
    const r = classifyByKeywords(leaseQuery);
    expect(r.category).toBe("property");
    expect(r.pathwayHints[0]).not.toMatch(/FIR/i);
  });

  it("marks agreeing keyword evidence as strong so the LLM cannot silently relabel it", () => {
    const r = classifyByKeywords(leaseQuery);
    expect(r.matchedKeywords).toContain("section 106");
    expect(r.matchedKeywords).toContain("landlord");
    expect(r.strong).toBe(true);
  });

  it("beats a lone incidental match with several agreeing ones", () => {
    // "notice" (civil) appears, but four property keywords agree.
    const r = classifyByKeywords(leaseQuery);
    expect(r.matchedKeywords.length).toBeGreaterThanOrEqual(3);
  });

  it("does not match keywords inside unrelated words", () => {
    // "fir" inside "confirmed", "pay" inside "payment", "firm" -> not criminal.
    const r = classifyByKeywords("I confirmed the payment but the firm did not deliver");
    expect(r.category).toBe("other");
  });

  it("still matches simple inflections of a keyword", () => {
    const r = classifyByKeywords("The lessor has issued two eviction notices and cancelled our leases");
    expect(r.category).toBe("property");
  });

  it("treats a bare legal question as a research question, not a grievance", () => {
    const r = classifyByKeywords("Is a 2-year non-compete clause enforceable in India?");
    expect(r.category).toBe("other");
    expect(r.subCategory).toBe("legal_question");
    // Must still offer a usable next step rather than an empty pathway list.
    expect(r.pathwayHints.length).toBeGreaterThan(0);
  });

  it("routes a B2B arbitration dispute to commercial", () => {
    const r = classifyByKeywords(
      "Our vendor breached the supply contract; the agreement has an arbitration clause"
    );
    expect(r.category).toBe("commercial");
  });
});
