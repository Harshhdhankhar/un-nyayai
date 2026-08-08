"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Status = "live" | "mock" | "unsupported" | "unverified" | "unconfigured";

interface Capability {
  key: string;
  label: string;
  status: Status;
  note?: string;
}

interface ProviderHealth {
  ok: boolean;
  mode: Status;
  checkedAt: string;
  error?: string;
  note?: string;
}

interface Provider {
  id: string;
  label: string;
  configured: boolean;
  capabilities: Capability[];
  health?: ProviderHealth;
}

const STATUS_TONE: Record<Status, "green" | "amber" | "slate" | "red" | "outline"> = {
  live: "green",
  mock: "amber",
  unverified: "amber",
  unsupported: "outline",
  unconfigured: "slate",
};

const STATUS_LABEL: Record<Status, string> = {
  live: "live",
  mock: "mock",
  unverified: "unverified",
  unsupported: "unsupported",
  unconfigured: "not configured",
};

export function ProviderStatus() {
  const [providers, setProviders] = useState<Provider[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/providers/status")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed"))))
      .then((data) => setProviders(data.providers))
      .catch(() => setError("Could not load provider status."));
  }, []);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Provider status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-critical-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!providers) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Provider status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-ink-400">Checking integrations…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Provider status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {providers.map((p) => (
          <div key={p.id} className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-navy-950">{p.label}</span>
              <Badge tone={STATUS_TONE[p.health?.mode ?? (p.configured ? "live" : "unconfigured")]}>
                {p.health?.mode ?? (p.configured ? "live" : "unconfigured")}
              </Badge>
            </div>
            {p.health?.error && (
              <p className="text-xs text-critical-600">{p.health.error}</p>
            )}
            {p.health?.note && <p className="text-xs text-ink-500">{p.health.note}</p>}
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {p.capabilities.map((c) => (
                <li
                  key={c.key}
                  className="flex items-center justify-between gap-2 rounded-md border border-ink-100 bg-ink-50/50 px-2.5 py-1.5 text-xs"
                >
                  <span className="text-ink-700">{c.label}</span>
                  <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                </li>
              ))}
            </ul>
            {p.capabilities.some((c) => c.note) && (
              <p className="text-xs leading-relaxed text-ink-400">
                {p.capabilities
                  .filter((c) => c.note)
                  .map((c) => c.note)
                  .join(" ")}
              </p>
            )}
          </div>
        ))}
        <p className="border-t border-ink-100 pt-3 text-xs leading-relaxed text-ink-400">
          “Live” means the capability was verified against the real provider API.
          “Mock” results are clearly labelled and never presented as real.
          Nothing here pretends an unverified integration works.
        </p>
      </CardContent>
    </Card>
  );
}
