import { describe, it, expect } from "vitest";
import {
  sourceFreshness,
  countStaleSources,
  STALE_AFTER_DAYS,
} from "@/lib/workbench/freshness";

const now = new Date("2026-08-01T00:00:00Z");
const DAY = 86_400_000;

describe("sourceFreshness", () => {
  it("flags a source retrieved within the threshold as fresh", () => {
    const f = sourceFreshness(new Date(now.getTime() - 30 * DAY), now);
    expect(f.state).toBe("fresh");
    expect(f.ageDays).toBe(30);
  });

  it("flags a source older than the threshold as stale", () => {
    const f = sourceFreshness(new Date(now.getTime() - (STALE_AFTER_DAYS + 1) * DAY), now);
    expect(f.state).toBe("stale");
  });

  it("reports unknown when no timestamp is present", () => {
    expect(sourceFreshness(null, now).state).toBe("unknown");
    expect(sourceFreshness(undefined, now).state).toBe("unknown");
    expect(sourceFreshness("not-a-date", now).state).toBe("unknown");
  });

  it("accepts ISO string timestamps", () => {
    const iso = new Date(now.getTime() - 10 * DAY).toISOString();
    const f = sourceFreshness(iso, now);
    expect(f.state).toBe("fresh");
    expect(f.ageDays).toBe(10);
  });

  it("counts stale sources across a set", () => {
    const sources = [
      { retrievedAt: new Date(now.getTime() - 10 * DAY) },
      { retrievedAt: new Date(now.getTime() - 200 * DAY) },
      { retrievedAt: null },
      {},
    ];
    expect(countStaleSources(sources, now)).toBe(1);
  });
});