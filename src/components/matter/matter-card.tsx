import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReadinessBar } from "./readiness-bar";

export interface MatterCardData {
  id: string;
  title: string;
  matterType: string;
  status: string;
  nextAction: string | null;
  readinessScore: number | null;
  court: string | null;
  cnr: string | null;
}

export function MatterCard({ matter }: { matter: MatterCardData }) {
  return (
    <Link href={`/app/matters/${matter.id}`} className="block">
      <Card className="transition-colors hover:border-navy-300">
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-ink-900">
                {matter.title}
              </h3>
              <p className="mt-0.5 truncate text-xs capitalize text-ink-500">
                {matter.matterType}
                {matter.cnr ? ` · ${matter.cnr}` : ""}
                {matter.court ? ` · ${matter.court}` : ""}
              </p>
            </div>
            <Badge tone={matter.status === "active" ? "green" : "slate"}>
              {matter.status}
            </Badge>
          </div>
          <ReadinessBar score={matter.readinessScore ?? 0} />
          {matter.nextAction && (
            <p className="text-xs text-ink-700">
              <span className="font-medium">Next:</span> {matter.nextAction}
            </p>
          )}
          <span className="inline-flex items-center gap-1 text-xs font-medium text-navy-700">
            Open matter <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
