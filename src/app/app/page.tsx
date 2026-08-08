import { getCurrentUser } from "@/lib/auth";
import { listMatters } from "@/lib/matters/service";
import { buildEvidenceChecklist } from "@/lib/matters/evidence";
import { getLegalAidServices } from "@/lib/legal/aid";
import { computeReadiness } from "@/lib/legal/readiness";
import { MatterCard } from "@/components/matter/matter-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Plus,
  FileSearch,
  ShieldCheck,
  Landmark,
  ArrowRight,
  MessageSquare,
} from "lucide-react";

export default async function AppDashboard() {
  const user = await getCurrentUser();
  if (!user) return null;
  const isAdvocate = user.role === "advocate";

  const matters = await listMatters(user.id);
  const firstMatter = matters[0];
  const evidence = firstMatter
    ? await buildEvidenceChecklist(firstMatter.id)
    : null;
  const aidServices = await getLegalAidServices(3);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-navy-950">
            {isAdvocate ? "Legal workspace" : `Namaste, ${user.fullName ?? user.email.split("@")[0]}`}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {isAdvocate
              ? "Your matters, hearings and drafting."
              : "Your legal matters and next steps."}
          </p>
        </div>
        <Link href="/app/assistant">
          <Button>
            <MessageSquare className="h-4 w-4" />
            Ask NyayAI
          </Button>
        </Link>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickAction href="/app/matters/new" icon={<Plus className="h-4 w-4" />} label="New matter" />
        <QuickAction href="/app/case-status" icon={<Landmark className="h-4 w-4" />} label="Check a case" />
        <QuickAction href="/app/legal-aid" icon={<ShieldCheck className="h-4 w-4" />} label="Free legal aid" />
        <QuickAction href="/app/assistant" icon={<FileSearch className="h-4 w-4" />} label="Ask a question" />
      </div>

      {/* Matters */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-400">
            {isAdvocate ? "Active matters" : "My matters"}
          </h2>
          <Link href="/app/matters" className="inline-flex items-center gap-1 text-xs font-medium text-navy-700 hover:underline">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {matters.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-sm text-ink-500">
                No matters yet. Start by describing your situation.
              </p>
              <Link href="/app/assistant" className="mt-4 inline-block">
                <Button variant="secondary">Start with your problem</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {matters.slice(0, isAdvocate ? 6 : 3).map((m) => (
              <MatterCard
                key={m.id}
                matter={{
                  id: m.id,
                  title: m.title,
                  matterType: m.matterType,
                  status: m.status,
                  nextAction: m.nextAction,
                  readinessScore: m.readinessScore,
                  court: m.court,
                  cnr: m.cnr,
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Evidence checklist for first matter */}
      {evidence && !isAdvocate && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-400">
            Documents needed
          </h2>
          <Card>
            <CardContent className="space-y-3">
              {evidence.missing.length === 0 && evidence.available.length === 0 ? (
                <p className="text-sm text-ink-500">
                  Add facts and documents to see what may be useful.
                </p>
              ) : null}
              {evidence.missing.slice(0, 4).map((m) => (
                <div key={m.title} className="flex items-start gap-3">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-400" />
                  <div>
                    <p className="text-sm text-ink-900">{m.title}</p>
                    <p className="text-xs text-ink-500">Potentially useful · {m.whyRelevant}</p>
                  </div>
                </div>
              ))}
              {evidence.available.slice(0, 3).map((a) => (
                <div key={a.title} className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 text-verified-700">✓</span>
                  <p className="text-sm text-ink-700">{a.title}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Legal aid */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-400">
          Official legal help
        </h2>
        <Card>
          <CardContent className="space-y-3">
            {aidServices.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink-900">{s.name}</p>
                  <p className="text-xs text-ink-500">{s.description}</p>
                </div>
                <span className="shrink-0 rounded-full bg-verified-100 px-2 py-0.5 text-xs font-medium text-verified-700">
                  Official
                </span>
              </div>
            ))}
            <p className="pt-1 text-[11px] text-ink-400">
              NyayAI does not provide legal representation. Contact the authority for official confirmation.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-lg border border-ink-200 bg-white px-3.5 py-3 text-sm font-medium text-ink-900 transition-colors hover:border-navy-300"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-navy-100 text-navy-800">
        {icon}
      </span>
      {label}
    </Link>
  );
}
