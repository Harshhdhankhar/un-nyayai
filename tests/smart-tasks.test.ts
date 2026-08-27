import { describe, it, expect } from "vitest";
import { suggestTasks, summarizeTasks } from "@/lib/intelligence/smart-tasks";
import type { CourtDirection } from "@/lib/intelligence/types";

function dir(text: string, addressee = "", compliance: CourtDirection["compliance"] = "pending"): CourtDirection {
  return {
    id: `d-${Math.random()}`,
    text,
    addressee,
    source: { kind: "ecourts", label: "Order dated 01 July 2026", field: "orders", recordId: "cnr-1", retrievedAt: "2026-07-01" },
    compliance,
  };
}

describe("suggestTasks", () => {
  it("generates a task per unique pending direction with provenance", () => {
    const t = suggestTasks([dir("File reply within two weeks", "Respondent")]);
    expect(t).toHaveLength(1);
    expect(t[0].provenance).toContain("Generated from: Order dated 01 July 2026");
    expect(t[0].kind).toBe("respond");
    expect(t[0].title).toContain("Respondent");
  });

  it("skips directions already possibly done", () => {
    const t = suggestTasks([dir("File reply", "", "possibly_done")]);
    expect(t).toHaveLength(0);
  });

  it("deduplicates repeated directions", () => {
    const t = suggestTasks([dir("File reply"), dir("File reply")]);
    expect(t).toHaveLength(1);
  });

  it("classifies produce/pay directions", () => {
    const t = suggestTasks([dir("Deposit the amount within one month")]);
    expect(t[0].kind).toBe("produce");
  });

  it("summarizes counts factually", () => {
    const t = suggestTasks([dir("File reply"), dir("Deposit amount"), dir("Appear on next date")]);
    const s = summarizeTasks(t);
    expect(s).toContain("3 suggested tasks");
    expect(s.toLowerCase()).not.toContain("win");
  });
});