import "server-only";
import { logger } from "@/lib/logger";

/* =========================================================================
 * Tool Router — deterministic request routing.
 *
 * Classifies a user message into the tool that should handle it, then the
 * orchestrator invokes the tool and assembles an evidence pack. Routing is
 * keyword/heuristic based and fully transparent: the chosen tool and reason
 * are always reported. The LLM is never the router — it only explains over
 * the material the chosen tool retrieves.
 * ========================================================================= */

export type ToolName =
  | "case-status"
  | "research"
  | "rights"
  | "triage"
  | "drafting"
  | "legal-aid";

export interface ToolRoute {
  tool: ToolName;
  reason: string;
  /** CNR number if the message looks like a case-status lookup. */
  cnr?: string;
}

const CNR_RE = /\b([A-Z]{2}\d{13,17})\b/i;
const CNR_LOOSE_RE = /\b\d{4,6}-\d{6}\b/;

/** Rough surface keywords per tool. Lowest-sensitivity — designed to avoid
 * false positives: an ambiguous message falls through to triage. */
const TOOL_KEYWORDS: Record<Exclude<ToolName, "triage">, string[]> = {
  "case-status": [
    "case status",
    "case status?",
    "status of my case",
    "case registered",
    "cnr",
    "case number",
    "court case",
    "next hearing",
    "hearing date",
    "pending case",
    "case is pending",
    "my case",
    "litigation status",
    "case progress",
  ],
  research: [
    "section ",
    "act",
    "law",
    "judgment",
    "judgement",
    "precedent",
    "ruling",
    "supreme court",
    "high court",
    "citation",
    "case law",
    "legal position",
    "under the",
    "rules",
    "rule ",
    "article ",
    "landmark",
    "interpretation",
  ],
  rights: [
    "my rights",
    "right to",
    "fundamental right",
    "am i entitled",
    "entitled to",
    "do i have a right",
    "rights as",
    "right under",
    "what are my rights",
    "know my rights",
    "rights of",
  ],
  drafting: [
    "draft a",
    "draft an",
    "drafting",
    "legal notice",
    "send a notice",
    "write a notice",
    "application",
    "complaint",
    "affidavit",
    "plaint",
    "petition",
    "reply to",
    "format for",
    "template for",
    "memorandum",
  ],
  "legal-aid": [
    "legal aid",
    "free legal",
    "free lawyer",
    "legal services authority",
    "nalsa",
    "pro bono",
    "can't afford a lawyer",
    "cannot afford",
    "low income lawyer",
    "legal assistance",
  ],
};

export function routeRequest(message: string): ToolRoute {
  const text = ` ${message.toLowerCase().replace(/\s+/g, " ")} `;

  // 1) CNR number → case-status (highest confidence signal).
  const cnr = extractCnr(message);
  if (cnr) {
    return { tool: "case-status", reason: "CNR number detected.", cnr };
  }

  // 2) Explicit case-status intent.
  if (containsAny(text, TOOL_KEYWORDS["case-status"])) {
    return { tool: "case-status", reason: "Case status intent detected." };
  }

  // 3) Drafting.
  if (containsAny(text, TOOL_KEYWORDS["drafting"])) {
    return { tool: "drafting", reason: "Drafting intent detected." };
  }

  // 4) Rights.
  if (containsAny(text, TOOL_KEYWORDS["rights"])) {
    return { tool: "rights", reason: "Rights intent detected." };
  }

  // 5) Legal aid.
  if (containsAny(text, TOOL_KEYWORDS["legal-aid"])) {
    return { tool: "legal-aid", reason: "Legal aid intent detected." };
  }

  // 6) Research intent.
  if (containsAny(text, TOOL_KEYWORDS["research"])) {
    return { tool: "research", reason: "Research intent detected." };
  }

  return { tool: "triage", reason: "No specific tool matched; using triage." };
}

function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k));
}

function extractCnr(message: string): string | undefined {
  const match = message.match(CNR_RE) ?? message.match(CNR_LOOSE_RE);
  if (!match) return undefined;
  return match[0].toUpperCase().replace(/\s+/g, "");
}

export function logRoute(route: ToolRoute, message: string) {
  logger.info("tool_route", { tool: route.tool, reason: route.reason, len: message.length });
}
