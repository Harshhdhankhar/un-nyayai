import { describe, it, expect } from "vitest";
import { templateBuilders } from "@/lib/drafting/templates";
import type { DraftMeta } from "@/lib/drafting/templates";

const meta: DraftMeta = {
  parties: [
    { name: "Anita Sharma", role: "tenant" },
    { name: "Rajesh Gupta", role: "landlord" },
  ],
  amounts: ["Rs 40,000"],
  dates: ["15 Jan 2025"],
  facts: [
    "Anita Sharma vacated the flat on 15 Jan 2025",
    "The landlord has not returned the security deposit",
  ],
  laws: [],
};

describe("drafting templates", () => {
  it("builds a legal notice containing parties and facts", () => {
    const t = templateBuilders.legal_notice;
    const title = t.title(meta);
    const body = t.body(meta);
    expect(title).toContain("Rajesh Gupta");
    expect(body).toContain("Anita Sharma");
    expect(body).toContain("security deposit");
  });

  it("builds a consumer complaint with prayer", () => {
    const body = templateBuilders.consumer_complaint.body(meta);
    expect(body).toContain("CONSUMER PROTECTION ACT");
    expect(body).toContain("PRAYER");
    expect(body).toContain("Rs 40,000");
  });

  it("builds an RTI application with fee clause", () => {
    const body = templateBuilders.rti_application.body(meta);
    expect(body).toContain("Right to Information Act");
    expect(body).toContain("₹10");
  });

  it("builds a rent agreement mentioning deposit", () => {
    const body = templateBuilders.rent_agreement.body(meta);
    expect(body).toContain("Anita Sharma");
    expect(body).toContain("Rs 40,000");
  });

  it("titles vary per template kind", () => {
    expect(templateBuilders.legal_notice.title(meta)).not.toBe(
      templateBuilders.rent_agreement.title(meta)
    );
  });
});
