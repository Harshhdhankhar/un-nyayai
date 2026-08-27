/* =========================================================================
 * Provenance builders — pure, dependency-free helpers for constructing
 * SourceRef / Claim objects consistently across the intelligence layer.
 *
 * Keeping construction in one place means every claim in the product is
 * traceable in the same shape, and the SourceDrawer always knows how to
 * render it. No database, no server-only imports — safe anywhere.
 * ========================================================================= */

import type {
  Claim,
  ProvenanceStatus,
  SourceRef,
} from "./types";

export function userRef(label = "Your statement", recordId?: string): SourceRef {
  return { kind: "user", label, recordId };
}

export function documentRef(
  name: string,
  opts: { documentId?: string; page?: number; passage?: string; field?: string } = {}
): SourceRef {
  return {
    kind: "document",
    label: name,
    recordId: opts.documentId,
    page: opts.page,
    passage: opts.passage,
    field: opts.field,
  };
}

export function ecourtsRef(
  field: string,
  opts: { cnr?: string; passage?: string; retrievedAt?: string; label?: string } = {}
): SourceRef {
  return {
    kind: "ecourts",
    label: opts.label ?? "eCourts — Case record",
    field,
    passage: opts.passage,
    retrievedAt: opts.retrievedAt,
    recordId: opts.cnr,
  };
}

export function kanoonRef(
  title: string,
  opts: { tid?: number; url?: string; passage?: string; retrievedAt?: string } = {}
): SourceRef {
  return {
    kind: "indian_kanoon",
    label: title,
    url: opts.url ?? (opts.tid ? `https://indiankanoon.org/doc/${opts.tid}/` : undefined),
    passage: opts.passage,
    retrievedAt: opts.retrievedAt,
    recordId: opts.tid ? String(opts.tid) : undefined,
  };
}

export function ruleRef(
  label: string,
  opts: { citation?: string; passage?: string } = {}
): SourceRef {
  return {
    kind: "verified_rule",
    label,
    field: opts.citation,
    passage: opts.passage,
  };
}

export function systemRef(label: string, passage?: string): SourceRef {
  return { kind: "system", label, passage };
}

let claimCounter = 0;
/** Deterministic-enough id for a claim within one build (no Date/random). */
function nextClaimId(prefix: string): string {
  claimCounter += 1;
  return `${prefix}-${claimCounter}`;
}

export function claim(
  text: string,
  status: ProvenanceStatus,
  sources: SourceRef[],
  id?: string
): Claim {
  return { id: id ?? nextClaimId("claim"), text, status, sources };
}

/** Map a stored matter_facts.source/kind pairing onto a ProvenanceStatus. */
export function factStatus(kind: string, source: string): ProvenanceStatus {
  if (kind === "missing") return "NEEDS_VERIFICATION";
  if (kind === "extracted" || source === "document") return "EXTRACTED";
  if (source === "ecourts") return "VERIFIED";
  return "USER_PROVIDED";
}

/** Map a stored verification_status onto the richer ProvenanceStatus. */
export function fromVerificationStatus(status: string): ProvenanceStatus {
  if (status === "verified") return "VERIFIED";
  if (status === "interpretation") return "INTERPRETATION";
  return "NEEDS_VERIFICATION";
}
