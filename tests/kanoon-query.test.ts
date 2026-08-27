import { describe, it, expect } from "vitest";
import { buildKanoonQuery } from "@/lib/providers/indian-kanoon/query";

describe("buildKanoonQuery", () => {
  it("strips filler words and lead-ins", () => {
    const r = buildKanoonQuery("find recent judgments about landlords refusing to return security deposits");
    expect(r.query.toLowerCase()).toContain("landlords");
    expect(r.query.toLowerCase()).toContain("security");
    expect(r.query.toLowerCase()).toContain("deposit");
    expect(r.query.toLowerCase()).not.toContain("find");
    expect(r.query.toLowerCase()).not.toContain("judgments");
    expect(r.query.toLowerCase()).not.toContain("about");
  });

  it("appends a court: token for a known court", () => {
    const r = buildKanoonQuery("Delhi High Court judgments about security deposit refund");
    expect(r.court).toContain("delhi");
    expect(r.query).toContain("court: delhi");
    expect(r.query.toLowerCase()).not.toContain("high court");
  });

  it("appends court: SC for the Supreme Court", () => {
    const r = buildKanoonQuery("Supreme Court bail judgments on cheating");
    expect(r.query).toContain("court: SC");
  });

  it("sets a date range for 'between X and Y'", () => {
    const r = buildKanoonQuery("recent judgments between 2018 and 2023 on deposit disputes");
    expect(r.filter.fromdate).toBe("2018-01-01");
    expect(r.filter.todate).toBe("2023-12-31");
    expect(r.yearHint).toBe("2018-2023");
  });

  it("sets a date range for a single year", () => {
    const r = buildKanoonQuery("delhi high court judgments in 2022 about tenant rights");
    expect(r.filter.fromdate).toBe("2022-01-01");
    expect(r.filter.todate).toBe("2022-12-31");
    expect(r.yearHint).toBe("2022");
  });

  it("leaves exact keyword queries intact (no filler)", () => {
    const r = buildKanoonQuery("anticipatory bail cheating");
    expect(r.query).toBe("anticipatory bail cheating");
    expect(r.filter.fromdate).toBeUndefined();
  });

  it("handles a blank query", () => {
    const r = buildKanoonQuery("   ");
    expect(r.query).toBe("");
  });

  it("never emits an unknown court token", () => {
    const r = buildKanoonQuery("find judgments about a contract dispute in Pune");
    expect(r.query).not.toContain("court:");
    expect(r.court).toBeNull();
  });
});