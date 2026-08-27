import { describe, it, expect } from "vitest";
import { draftKinds } from "@/lib/drafting/service";
import { draftKind } from "@/lib/db/schema";

describe("draft kind enum consistency", () => {
  it("every service draft kind exists in the DB draft_kind enum", () => {
    const dbValues = draftKind.enumValues;
    for (const kind of draftKinds) {
      expect(dbValues).toContain(kind);
    }
  });
});
