/* =========================================================================
 * Source Coverage Map — where the information comes from.
 *
 * Shows SOURCE COUNTS by category and source kind (documents, user provided,
 * court records, Indian Kanoon, statutes…). Deliberately NOT percentages: we
 * show real counts/categories so the user can see coverage, not a fake ratio.
 * ========================================================================= */

import type { MatterBundle } from "@/lib/intelligence/inputs";
import type { CaseSnapshotData } from "@/lib/intelligence/inputs";
import type { SourceCoverageCategory, SourceCoverageBucket } from "./types";

export function buildSourceCoverage(
  bundle: MatterBundle,
  snapshot: CaseSnapshotData | null
): SourceCoverageCategory[] {
  const categories: SourceCoverageCategory[] = [];
  const bucket = (label: string, kind: SourceCoverageBucket["kind"], count: number): SourceCoverageBucket => ({
    label,
    kind,
    count,
  });

  // Case information.
  const caseBuckets: SourceCoverageBucket[] = [];
  const ecourtsEvents = bundle.events.filter((e) => e.source === "ecourts").length;
  if (snapshot) {
    caseBuckets.push(bucket("eCourts case record", "ecourts", 1));
    caseBuckets.push(bucket(`Hearings on record`, "ecourts", snapshot.history.length));
    caseBuckets.push(bucket(`Orders on record`, "ecourts", snapshot.orders.length));
  }
  if (ecourtsEvents > 0) caseBuckets.push(bucket("eCourts timeline events", "ecourts", ecourtsEvents));
  if (caseBuckets.length > 0) categories.push({ category: "Case information", buckets: caseBuckets });

  // Facts.
  const factBuckets: SourceCoverageBucket[] = [];
  const extracted = bundle.facts.filter((f) => f.kind === "extracted" || f.source === "document").length;
  const userFacts = bundle.facts.filter((f) => f.kind !== "missing" && f.source !== "document" && f.source !== "ecourts").length;
  const missing = bundle.facts.filter((f) => f.kind === "missing").length;
  if (bundle.documents.length) factBuckets.push(bucket("Documents", "document", bundle.documents.length));
  if (extracted) factBuckets.push(bucket("Extracted from documents", "document", extracted));
  if (userFacts) factBuckets.push(bucket("User provided", "user", userFacts));
  if (missing) factBuckets.push(bucket("Open questions", "user", missing));
  if (factBuckets.length) categories.push({ category: "Facts", buckets: factBuckets });

  // Evidence.
  const evBuckets: SourceCoverageBucket[] = [];
  const available = bundle.evidence.filter((e) => e.status === "available").length;
  const needsVer = bundle.evidence.filter((e) => e.status === "needs_verification").length;
  const evMissing = bundle.evidence.filter((e) => e.status === "missing").length;
  if (available) evBuckets.push(bucket("Available", "document", available));
  if (needsVer) evBuckets.push(bucket("Needs verification", "user", needsVer));
  if (evMissing) evBuckets.push(bucket("Not yet collected", "user", evMissing));
  if (evBuckets.length) categories.push({ category: "Evidence", buckets: evBuckets });

  // Legal research.
  const resBuckets: SourceCoverageBucket[] = [];
  const byType = new Map<string, number>();
  for (const s of bundle.sources) byType.set(s.type, (byType.get(s.type) ?? 0) + 1);
  const judgments = bundle.sources.filter((s) => s.type === "judgment" || Boolean(s.url)).length;
  if (judgments) resBuckets.push(bucket("Authorities (judgments)", "indian_kanoon", judgments));
  for (const [type, count] of byType) {
    if (type === "judgment") continue;
    if (!type) continue;
    resBuckets.push(bucket(`${type.charAt(0).toUpperCase()}${type.slice(1)} sources`, "verified_rule", count));
  }
  if (resBuckets.length) categories.push({ category: "Legal research", buckets: resBuckets });

  return categories;
}
