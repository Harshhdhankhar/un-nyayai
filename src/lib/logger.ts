import "server-only";

/**
 * Structured logger with request-id correlation.
 * IMPORTANT: never log document contents or user confidential text — only
 * ids, counts, statuses and errors (sanitized).
 */

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function currentRank(): number {
  const configured = (process.env.LOG_LEVEL ?? "info") as Level;
  return LEVEL_RANK[configured] ?? LEVEL_RANK.info;
}

function emit(level: Level, message: string, meta?: Record<string, unknown>) {
  if (LEVEL_RANK[level] < currentRank()) return;
  const line = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...meta,
  };
  if (level === "error") {
    console.error(JSON.stringify(line));
  } else if (level === "warn") {
    console.warn(JSON.stringify(line));
  } else {
    console.log(JSON.stringify(line));
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) =>
    emit("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => emit("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) =>
    emit("error", msg, meta),
};

/** Timing helper for observability. */
export async function time<T>(
  label: string,
  fn: () => Promise<T>,
  meta?: Record<string, unknown>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    logger.debug("timed", { label, ms: Math.round(performance.now() - start), ...meta });
    return result;
  } catch (err) {
    logger.error("timed_error", {
      label,
      ms: Math.round(performance.now() - start),
      error: safeError(err),
      ...meta,
    });
    throw err;
  }
}

/** Sanitize an error into a safe, loggable string (never leaks secrets). */
export function safeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
