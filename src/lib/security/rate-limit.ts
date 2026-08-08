import "server-only";
import crypto from "node:crypto";

/**
 * Lightweight in-memory sliding-window rate limiter.
 * Suitable for a single-instance deployment / hackathon. Production would
 * swap this for a shared store (Redis/Upstash).
 */

const buckets = new Map<string, number[]>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds?: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((t) => t > windowStart);

  if (hits.length >= limit) {
    const oldest = hits[0] ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    buckets.set(key, hits);
    return { ok: false, remaining: 0, retryAfterSeconds };
  }

  hits.push(now);
  buckets.set(key, hits);
  return { ok: true, remaining: limit - hits.length };
}

/** Opportunistic cleanup so the map doesn't grow unboundedly. */
export function sweepRateLimiter(now = Date.now()) {
  for (const [key, hits] of buckets) {
    const recent = hits.filter((t) => t > now - 60_000);
    if (recent.length === 0) buckets.delete(key);
    else buckets.set(key, recent);
  }
}

// Sweep every 5 minutes.
const interval = setInterval(() => sweepRateLimiter(), 5 * 60_000);
interval.unref?.();

/** Stable per-IP+user key for API routes. */
export function rateLimitKey(ip: string, userKey: string, scope: string) {
  return `${scope}:${ip}:${userKey}`;
}

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "local";
}

export function requestId(): string {
  return crypto.randomUUID();
}
