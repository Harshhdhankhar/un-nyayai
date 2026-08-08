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
