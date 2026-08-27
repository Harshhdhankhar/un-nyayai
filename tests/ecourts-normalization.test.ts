import { describe, it, expect } from "vitest";
import { mapCaseDetail } from "@/lib/providers/ecourts/mapper";
import { detailToSnapshot } from "@/lib/intelligence/case-store";

describe("eCourts detail normalization (deterministic)", () => {
  const raw = {
    courtCaseData: {
      cnr: "DLHC010001232024",
      courtName: "Delhi High Court",
      cnrCourtCode: "DLHC01",
      caseNumber: "WP(C) 138/2024",
      caseType: "Writ Petition (Civil)",
      caseTypeRaw: "CWP",
      caseStatus: "PENDING",
      caseStatusRaw: "Adjourned",
      petitioners: ["Amit Sharma"],
      respondents: ["State of Delhi"],
      judges: ["Hon'ble Justice X"],
      petitionerAdvocates: ["Adv. Y"],
      filingDate: "2024-02-01",
      firstHearingDate: "2024-03-01",
      decisionDate: null,
      historyOfCaseHearings: [
        { hearingDate: "2024-03-01", purposeOfListing: "Admission", hearingResult: "Admitted" },
        { hearingDate: "2024-04-05", purpose: "Final Hearing", result: "Reserved" },
      ],
      judgmentOrders: [{ orderDate: "2024-04-05", orderType: "Interim Order", orderUrl: "https://x" }],
      orderCount: 1,
    },
    entityInfo: { nextDateOfHearing: "2024-05-10T00:00:00" },
  };

  it("normalizes status, next hearing date, parties, and history", () => {
    const d = mapCaseDetail(raw);
    expect(d.record.caseStatus).toBe("pending");
    expect(d.record.nextHearingDate).toBe("2024-05-10");
    expect(d.record.petitioner).toBe("Amit Sharma");
    expect(d.record.respondent).toBe("State of Delhi");
    expect(d.history).toHaveLength(2);
    expect(d.history[1].result).toBe("Reserved");
    expect(d.orders).toHaveLength(1);
    expect(d.parties?.respondents).toEqual(["State of Delhi"]);
  });

  it("normalizes DISPOSED to disposed", () => {
    const disposed = mapCaseDetail({
      courtCaseData: { ...raw.courtCaseData, caseStatus: "DISPOSED" },
    });
    expect(disposed.record.caseStatus).toBe("disposed");
  });

  it("falls back to unknown status and empty fields on malformed input", () => {
    const d = mapCaseDetail({});
    expect(d.record.caseStatus).toBe("unknown");
    expect(d.record.petitioner).toBe("");
    expect(d.history).toEqual([]);
    expect(d.orders).toEqual([]);
  });
});

describe("detailToSnapshot (snapshot mapping)", () => {
  const detail = mapCaseDetail({
    courtCaseData: {
      cnr: "DLHC010001232024",
      caseStatus: "PENDING",
      nextHearingDate: null,
      historyOfCaseHearings: [{ hearingDate: "2024-03-01", purpose: "Hearing", result: "Admitted" }],
      judgmentOrders: [{ orderDate: "2024-03-01", orderType: "Order" }],
    },
    entityInfo: { nextDateOfHearing: "2024-06-01" },
  });

  it("extracts the flat fields used by change intelligence", () => {
    const snap = detailToSnapshot("DLHC010001232024", "live", detail, "2024-05-01T00:00:00Z");
    expect(snap.cnr).toBe("DLHC010001232024");
    expect(snap.mode).toBe("live");
    expect(snap.caseStatus).toBe("pending");
    expect(snap.nextHearingDate).toBe("2024-06-01");
    expect(snap.history).toHaveLength(1);
    expect(snap.orders).toHaveLength(1);
    expect(snap.capturedAt).toBe("2024-05-01T00:00:00Z");
  });
});