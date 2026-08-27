import { describe, it, expect } from "vitest";
import { rateLimit, rateLimitKey } from "@/lib/security/rate-limit";

describe("rate limiter", () => {
  it("allows requests up to the limit", () => {
    for (let i = 0; i < 5; i++) {
      const r = rateLimit("k", 5, 60_000);
      expect(r.ok).toBe(true);
    }
  });

  it("rejects once the limit is exceeded and reports retry", () => {
    for (let i = 0; i < 3; i++) rateLimit("k2", 3, 60_000);
    const r = rateLimit("k2", 3, 60_000);
    expect(r.ok).toBe(false);
    expect(r.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(r.remaining).toBe(0);
  });

  it("keeps separate buckets per key", () => {
    for (let i = 0; i < 5; i++) rateLimit("a", 5, 60_000);
    const other = rateLimit("b", 5, 60_000);
    expect(other.ok).toBe(true);
  });

  it("builds a stable per-user+ip+scope key", () => {
    const a = rateLimitKey("203.0.113.1", "user-1", "assistant");
    const b = rateLimitKey("203.0.113.1", "user-1", "assistant");
    expect(a).toBe(b);
    expect(a).toContain("assistant");
    expect(a).toContain("user-1");
  });
});