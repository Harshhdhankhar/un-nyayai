import { describe, it, expect } from "vitest";
import {
  classifyProviderError,
  providerFailure,
  isTimeoutError,
  circuitBreakerKey,
  isCircuitOpen,
  recordSuccess,
  recordFailure,
} from "@/lib/providers/result";

describe("classifyProviderError", () => {
  it("reports NOT_CONFIGURED when the provider is not configured", () => {
    const f = classifyProviderError(new Error("boom"), { configured: false });
    expect(f.kind).toBe("NOT_CONFIGURED");
    expect(f.retryable).toBe(false);
  });

  it("reports TIMEOUT for abort/timeout errors", () => {
    expect(isTimeoutError(new Error("fetch timed out"))).toBe(true);
    const f = classifyProviderError(new Error("The operation was aborted due to timeout"), { configured: true, hadCached: true });
    expect(f.kind).toBe("TIMEOUT");
    expect(f.hadCached).toBe(true);
    expect(f.retryable).toBe(true);
  });

  it("reports RATE_LIMITED for 429-style errors", () => {
    const f = classifyProviderError(new Error("HTTP 429 Too Many Requests"), { configured: true });
    expect(f.kind).toBe("RATE_LIMITED");
  });

  it("reports AUTHENTICATION_FAILED for 401/403 or key errors", () => {
    const f = classifyProviderError(new Error("API key invalid (401)"), { configured: true });
    expect(f.kind).toBe("AUTHENTICATION_FAILED");
  });

  it("defaults to FAILED otherwise", () => {
    const f = classifyProviderError(new Error("network hiccup"), { configured: true });
    expect(f.kind).toBe("FAILED");
    expect(f.retryable).toBe(true);
  });
});

describe("circuit breaker", () => {
  it("opens after repeated failures and blocks auto-retry", () => {
    const key = circuitBreakerKey("test", "u1");
    expect(isCircuitOpen(key)).toBe(false);
    for (let i = 0; i < 3; i++) recordFailure(key);
    expect(isCircuitOpen(key)).toBe(true);
  });

  it("clears on success so manual retry proceeds", () => {
    const key = circuitBreakerKey("test", "u2");
    for (let i = 0; i < 3; i++) recordFailure(key);
    expect(isCircuitOpen(key)).toBe(true);
    recordSuccess(key);
    expect(isCircuitOpen(key)).toBe(false);
  });

  it("never treats consecutive success as a failure", () => {
    const f = providerFailure("FAILED", "x");
    expect(f.ok).toBe(false);
    expect(f.kind).toBe("FAILED");
  });
});