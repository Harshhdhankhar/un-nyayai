import "server-only";
import { config, hasGroq, hasIndianKanoon, hasEcourts } from "@/lib/config";

/* =========================================================================
 * Provider capability matrix.
 *
 * Every integration declares which capabilities are supported, whether they
 * were VERIFIED against the live API ("live"), fall back to labelled mock
 * data ("mock"), or are not implemented at all ("unsupported"). We never
 * invent an endpoint: anything marked "live" has been exercised against the
 * real provider.
 *
 * eCourts note: the configured base URL (ECOURTS_BASE_URL) is Cloudflare-
 * blocked and its auth flow could not be verified, so all eCourts
 * capabilities are currently reported as unsupported/unverified even when a
 * key is present. See the pause decision in the work log.
 * ========================================================================= */

export type CapabilityStatus =
  | "live"
  | "mock"
  | "unsupported"
  | "unverified"
  | "unconfigured";

export interface Capability {
  key: string;
  label: string;
  status: CapabilityStatus;
  note?: string;
}

export interface ProviderCapabilities {
  id: "groq" | "indian-kanoon" | "ecourts";
  label: string;
  configured: boolean;
  capabilities: Capability[];
}

export function getProviderCapabilities(): ProviderCapabilities[] {
  return [
    {
      id: "groq",
      label: "Groq (LLM)",
      configured: hasGroq,
      capabilities: [
        {
          key: "chat-completions",
          label: "Chat completions",
          status: hasGroq ? "live" : "unconfigured",
        },
        {
          key: "streaming",
          label: "Streaming completions",
          status: hasGroq ? "live" : "unconfigured",
        },
        {
          key: "json-output",
          label: "JSON structured output",
          status: hasGroq ? "live" : "unconfigured",
        },
      ],
    },
    {
      id: "indian-kanoon",
      label: "Indian Kanoon",
      configured: hasIndianKanoon,
      capabilities: [
        {
          key: "search",
          label: "Case law search",
          status: hasIndianKanoon ? "live" : "unconfigured",
        },
        {
          key: "document",
          label: "Full document text",
          status: hasIndianKanoon ? "live" : "unconfigured",
        },
        {
          key: "metadata",
          label: "Document metadata",
          status: hasIndianKanoon ? "live" : "unconfigured",
        },
        {
          key: "fragments",
          label: "Relevant fragments",
          status: hasIndianKanoon ? "live" : "unconfigured",
        },
        {
          key: "origdoc",
          label: "Court copy (origdoc)",
          status: hasIndianKanoon ? "live" : "unconfigured",
        },
        {
          key: "citations",
          label: "Citations (cites/citedby)",
          status: hasIndianKanoon ? "live" : "unconfigured",
        },
      ],
    },
    {
      id: "ecourts",
      label: "eCourts (eCourtsIndia API)",
      configured: hasEcourts,
      capabilities: [
        {
          key: "case-status",
          label: "Case detail by CNR",
          status: hasEcourts ? "live" : "unconfigured",
        },
        {
          key: "case-search",
          label: "Case search (facets)",
          status: hasEcourts ? "live" : "unconfigured",
        },
        {
          key: "case-history",
          label: "Hearing history",
          status: hasEcourts ? "live" : "unconfigured",
        },
        {
          key: "orders",
          label: "Orders & judgments",
          status: hasEcourts ? "live" : "unconfigured",
        },
        {
          key: "refresh",
          label: "On-demand case refresh",
          status: hasEcourts ? "live" : "unconfigured",
        },
        {
          key: "enums",
          label: "Code dictionaries (enums)",
          status: hasEcourts ? "live" : "unconfigured",
        },
      ],
    },
  ];
}

export function providerById(id: ProviderCapabilities["id"]) {
  return getProviderCapabilities().find((p) => p.id === id);
}

export { config, hasGroq, hasIndianKanoon, hasEcourts };
