import "dotenv/config";
import { describe, it, expect } from "vitest";
import {
  search,
  fetchDocument,
  fetchFragments,
  fetchCourtCopy,
  checkKanoonHealth,
} from "@/lib/providers/indian-kanoon";

const hasKey = Boolean(process.env.INDIAN_KANOON_API_KEY);

describe.runIf(hasKey)("Indian Kanoon live API", () => {
  it("health returns live", async () => {
    const h = await checkKanoonHealth();
    expect(h.mode).toBe("live");
  });

  it("searches real judgments", async () => {
    const s = await search("anticipatory bail cheating");
    expect(s.mode).toBe("live");
    expect(s.results.length).toBeGreaterThan(0);
    const r = s.results[0];
    expect(r.tid).toBeGreaterThan(0);
    expect(r.title.length).toBeGreaterThan(0);
  });

  it("fetches a real document + metadata", async () => {
    const s = await search("anticipatory bail cheating");
    const tid = s.results[0].tid;
    const d = await fetchDocument(tid);
    expect(d).not.toBeNull();
    if (!d) return;
    expect(d.mode).toBe("live");
    expect(d.doc).toBeTruthy();
    expect(d.doc.fullText.length).toBeGreaterThan(100);
  });

  it("fetches fragments for a query", async () => {
    const s = await search("anticipatory bail cheating");
    const tid = s.results[0].tid;
    const f = await fetchFragments(tid, "bail");
    expect(f.mode).toBe("live");
  });

  it("fetches a court copy (origdoc) without error", async () => {
    const s = await search("anticipatory bail cheating");
    const tid = s.results[0].tid;
    const c = await fetchCourtCopy(tid);
    expect(c.mode).toBe("live");
    expect(c.doc.length).toBeGreaterThan(0);
  });
});
