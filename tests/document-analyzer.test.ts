import { describe, expect, it } from "vitest";
import { classifyDocument, expectedClausesFor, normalizeDocumentType } from "@/lib/documents/classify";
import { extractClauses } from "@/lib/documents/clauses";
import { ruleRisks } from "@/lib/documents/risks";
import { detectMissingInfo } from "@/lib/documents/missing";
import { localPiiMatches, dedupeOverlaps, luhnValid, verhoeffValid, redactText } from "@/lib/documents/pii";

const RENTAL = `
RENTAL AGREEMENT

This Rental Agreement is made on 12 March 2025 between Mr. Ramesh Kumar (Landlord) and Ms. Anita Sharma (Tenant).

1. RENT: The tenant shall pay monthly rent of Rs 25000 by the 7th of every month.
2. SECURITY DEPOSIT: A security deposit of Rs 50000 shall be paid and is refundable within 30 days of vacating.
3. LOCK-IN PERIOD: There is a lock-in period of 11 months; early exit leads to forfeiture of the deposit.
4. TERMINATION: Either party may terminate this agreement by giving 2 months written notice.
5. MAINTENANCE: The tenant shall be responsible for day-to-day maintenance and repairs.
6. SUBLETTING: The tenant shall not sublet the premises.
7. JURISDICTION: Courts at Delhi shall have exclusive jurisdiction.
`;

const NOTICE = `
LEGAL NOTICE

To, Mr. Verma. My client instructs me to state that you failed to repay Rs 1,00,000 despite repeated reminders. Take notice that if payment is not made within 15 days, civil and criminal proceedings shall follow.
`;

describe("document classification", () => {
  it("classifies a rental agreement", () => {
    const c = classifyDocument(RENTAL);
    expect(c.name).toBe("Rental Agreement");
    expect(c.confidence).toBeGreaterThan(0.5);
  });

  it("classifies a legal notice", () => {
    const c = classifyDocument(NOTICE);
    expect(c.name).toBe("Legal Notice");
  });

  it("returns Other / Unknown for random text instead of a false claim", () => {
    const c = classifyDocument("The quick brown fox jumps over the lazy dog. Nothing legal here at all.");
    expect(c.name).toBe("Other / Unknown");
    expect(c.confidence).toBeLessThan(0.5);
  });

  it("normalizes unknown LLM type names to Other / Unknown", () => {
    expect(normalizeDocumentType("Rental Agreement")).toBe("Rental Agreement");
    expect(normalizeDocumentType("Mystery Deed")).toBe("Other / Unknown");
  });

  it("exposes expected clause checklists per type", () => {
    const clauses = expectedClausesFor("Rental Agreement");
    expect(clauses).toContain("Security Deposit");
    expect(clauses).toContain("Lock-in Period");
  });
});

describe("clause extraction", () => {
  it("splits numbered clauses with page provenance", () => {
    const clauses = extractClauses(RENTAL, [0]);
    const titles = clauses.map((c) => c.title);
    expect(clauses.length).toBeGreaterThanOrEqual(5);
    expect(titles.some((t) => /rent/i.test(t))).toBe(true);
    expect(titles.some((t) => /jurisdiction/i.test(t))).toBe(true);
    expect(clauses.every((c) => c.page === 1)).toBe(true);
  });

  it("categorizes known clause types", () => {
    const clauses = extractClauses(RENTAL);
    const categories = clauses.map((c) => c.category);
    expect(categories).toContain("Rent");
    expect(categories).toContain("Jurisdiction");
  });

  it("falls back to paragraph blocks when no headings exist", () => {
    const text = `${"Lorem ipsum dolor sit amet. ".repeat(10)}\n\n${"Consectetur adipiscing elit sed do eiusmod. ".repeat(10)}`;
    const clauses = extractClauses(text);
    expect(clauses.length).toBeGreaterThan(0);
  });
});

describe("risk rules", () => {
  it("flags forfeiture/lock-in language as hedged findings", () => {
    const clauses = extractClauses(RENTAL);
    const risks = ruleRisks(clauses);
    expect(risks.length).toBeGreaterThan(0);
    const lockIn = risks.find((r) => r.clauseTitle.toLowerCase().includes("lock"));
    expect(lockIn).toBeDefined();
    // hedged wording — never a definite illegality claim
    expect(lockIn!.whyItMatters).toMatch(/appears|may|can/i);
  });
});

describe("missing information", () => {
  it("detects absent items in a sparse rental agreement", () => {
    const sparse = "This rental agreement is made between A and B.";
    const missing = detectMissingInfo("Rental Agreement", [], sparse);
    expect(missing.some((m) => m.item.includes("Dispute Resolution"))).toBe(true);
    expect(missing.every((m) => m.status === "missing_from_document")).toBe(true);
  });

  it("does not flag items present in the text", () => {
    const missing = detectMissingInfo("Rental Agreement", [], RENTAL);
    expect(missing.some((m) => m.item === "Rent")).toBe(false);
    expect(missing.some((m) => m.item === "Jurisdiction / Governing Law")).toBe(false);
  });

  it("distinguishes commonly-expected from possibly-legally-required items", () => {
    const missing = detectMissingInfo("Rental Agreement", [], "Basic text only.");
    const expectations = new Set(missing.map((m) => m.expectation));
    expect(expectations.has("commonly_expected")).toBe(true);
  });
});

describe("PII recognizers", () => {
  it("validates Aadhaar via Verhoeff checksum", () => {
    expect(verhoeffValid("239571831")).toBe(false); // wrong length
    expect(verhoeffValid("2363")).toBe(true); // canonical Verhoeff example
    expect(verhoeffValid("492743891284")).toBe(true);
  });

  it("validates cards via Luhn", () => {
    expect(luhnValid("4532015112830366")).toBe(true);
    expect(luhnValid("4532015112830367")).toBe(false);
  });

  it("detects PAN, Aadhaar, IFSC, email, phone locally", () => {
    const text =
      "PAN ABCDE1234F Aadhaar 492743891282 IFSC HDFC0001234 email a@b.com call 9876543210 account no: 123456789";
    const found = dedupeOverlaps(localPiiMatches(text));
    const types = found.map((f) => f.entityType);
    expect(types).toContain("PAN");
    expect(types).toContain("AADHAAR");
    expect(types).toContain("IFSC");
    expect(types).toContain("EMAIL_ADDRESS");
    expect(types).toContain("PHONE_NUMBER");
    expect(types).toContain("BANK_ACCOUNT");
  });

  it("gives low confidence to checksum-failing numbers", () => {
    const found = localPiiMatches("Aadhaar 111122223333");
    const aadhaar = found.find((f) => f.entityType === "AADHAAR");
    expect(aadhaar).toBeDefined();
    expect(aadhaar!.confidence).toBeLessThan(0.6);
  });

  it("redacts findings with typed placeholders", () => {
    const text = "Call me at 9876543210 please.";
    const matches = localPiiMatches(text);
    const redacted = redactText(text, matches.map((m) => ({ ...m, page: null, entityType: m.entityType, text: text.slice(m.start, m.end), end: m.end, start: m.start })));
    expect(redacted).not.toContain("9876543210");
    expect(redacted).toContain("[PHONE_NUMBER]");
  });
});
