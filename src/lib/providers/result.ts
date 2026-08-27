import "server-only";

/* =========================================================================
 * Provider failure taxonomy + lightweight circuit breaker.
 *
 * Every provider failure is reduced to a stable machine label so the UI can
 * respond appropriately instead of a generic "something went wrong". The
 * circuit breaker prevents repeatedly hammering a provider that keeps failing,
 * while still allowing an explicit manual retry.
 * ========================================================================= */

export type ProviderFailureKind =
  | "FAILED"
  | "NO_RESULT"
  | "NOT_CONFIGURED"
  | "RATE_LIMITED"
  | "INVALID_REQUEST"
  | "AUTHENTICATION_FAILED"
  | "TIMEOUT";

export interface ProviderFailure {
  ok: false;
  kind: ProviderFailureKind;
  message: string;
  /** When NO_RESULT, previously saved data (if any) should be shown. */
  hadCached: boolean;
  /** True when the caller should offer a manual retry. */
  retryable: boolean;
}

export function providerFailure(
  kind: ProviderFailureKind,
  message: string,
  hadCached = false
): ProviderFailure {
  return {
    ok: false,
    kind,
    message,
    hadCached,
    retryable: kind === "TIMEOUT" || kind === "FAILED" || kind === "RATE_LIMITED",
  };
}

export function isRateLimit(status: number): boolean {
  return status === 429;
}

export function isAuthFailure(status: number): boolean {
  return status === 401 || status === 403;
}

export function isTimeoutError(cause: unknown): boolean {
  return cause instanceof Error && /abort|timeout|timed ?out/i.test(cause.message);
}

export function classifyProviderError(cause: unknown, opts: { configured: boolean; hadCached?: boolean }): ProviderFailure {
  const hadCached = opts.hadCached ?? false;
  if (!opts.configured) {
    return providerFailure("NOT_CONFIGURED", "This provider is not configured, so live data is unavailable.", hadCached);
  }
  if (isTimeoutError(cause)) {
    return providerFailure("TIMEOUT", "The provider timed out. Previously saved data remains available.", hadCached);
  }
  const message = cause instanceof Error ? cause.message : String(cause);
  if (/rate.?limit|429|too many/i.test(message)) {
    return providerFailure("RATE_LIMITED", "The provider is rate-limited right now. Please wait and try again.", hadCached);
  }
  if (/401|403|unauthor|api key|invalid key|auth/i.test(message)) {
    return providerFailure("AUTHENTICATION_FAILED", "The provider rejected the credentials. Check the configured key.", hadCached);
  }
  if (/400|invalid|malformed/i.test(message)) {
    return providerFailure("INVALID_REQUEST", "The request was rejected as invalid.", hadCached);
  }
  return providerFailure("FAILED", message || "The provider could not be reached.", hadCached);
}

/* --------------------------- circuit breaker ---------------------------- */

const state = new Map<string, { failures: number[]; openUntil: number }>();

const MAX_FAILURES = 3;
const WINDOW_MS = 60_000;
const OPEN_MS = 30_000;

export function circuitBreakerKey(scope: string, userKey: string): string {
  return `${scope}:${userKey}`;
}

/** True when calls for this key should currently be skipped (auto-retry off). */
export function isCircuitOpen(key: string): boolean {
  const s = state.get(key);
  if (!s) return false;
  if (s.openUntil > Date.now()) return true;
  state.delete(key);
  return false;
}

/** Record a success — clears any open state so manual retry can proceed. */
export function recordSuccess(key: string): void {
  state.delete(key);
}

/** Record a failure and open the circuit once the window is exceeded. */
export function recordFailure(key: string): void {
  const now = Date.now();
  const s = state.get(key) ?? { failures: [], openUntil: 0 };
  s.failures.push(now);
  s.failures = s.failures.filter((t) => now - t < WINDOW_MS);
  if (s.failures.length >= MAX_FAILURES) {
    s.openUntil = now + OPEN_MS;
    s.failures = [];
  }
  state.set(key, s);
}
