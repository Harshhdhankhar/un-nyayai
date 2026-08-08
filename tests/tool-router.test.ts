import { describe, it, expect } from "vitest";
import { routeRequest } from "@/lib/ai/tool-router";
import { isChattyMessage } from "@/lib/ai/orchestrator";

describe("tool router", () => {
  it("routes CNR numbers to case-status", () => {
    const r = routeRequest("check my case status for CNR UP010003456782022");
    expect(r.tool).toBe("case-status");
    expect(r.cnr).toBe("UP010003456782022");
  });

  it("routes case-status intent", () => {
    expect(routeRequest("what is the status of my case?").tool).toBe("case-status");
    expect(routeRequest("next hearing date?").tool).toBe("case-status");
  });

  it("routes drafting intent", () => {
    expect(routeRequest("can you draft a legal notice for me?").tool).toBe("drafting");
    expect(routeRequest("write a complaint application").tool).toBe("drafting");
  });

  it("routes rights intent", () => {
    expect(routeRequest("what are my rights as a tenant?").tool).toBe("rights");
  });

  it("routes legal aid intent", () => {
    expect(routeRequest("can I get free legal aid from NALSA?").tool).toBe("legal-aid");
  });

  it("routes research intent", () => {
    expect(routeRequest("what does section 138 say?").tool).toBe("research");
    expect(routeRequest("recent supreme court judgment on bail").tool).toBe("research");
  });

  it("falls through to triage for ambiguous messages", () => {
    expect(routeRequest("I was fired without notice yesterday").tool).toBe("triage");
    expect(routeRequest("hello").tool).toBe("triage");
  });

  it("prefers case-status over drafting when both match", () => {
    const r = routeRequest("my case is pending, can you draft an application?");
    expect(r.tool).toBe("case-status");
  });

  it("detects greetings and small talk as chat, not legal", () => {
    expect(isChattyMessage("hi")).toBe(true);
    expect(isChattyMessage("Hello!")).toBe(true);
    expect(isChattyMessage("thank you so much")).toBe(true);
    expect(isChattyMessage("good morning")).toBe(true);
    expect(isChattyMessage("ok thanks")).toBe(true);
  });

  it("does not misclassify real legal questions as small talk", () => {
    expect(isChattyMessage("my landlord kept my deposit")).toBe(false);
    expect(isChattyMessage("I was fired without notice, what are my rights?")).toBe(false);
    expect(isChattyMessage("ok so what happens next if they don't pay me")).toBe(false);
  });
});
