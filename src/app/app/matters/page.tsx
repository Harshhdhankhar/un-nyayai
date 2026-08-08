import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listMatters } from "@/lib/matters/service";
import { MatterCard } from "@/components/matter/matter-card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const metadata = { title: "My matters" };

export default async function MattersPage() {
  const user = await getCurrentUser();
  const matters = user ? await listMatters(user.id) : [];

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-navy-950">
            {user?.role === "advocate" ? "Matters" : "My matters"}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Every matter is a workspace for facts, documents, research and next steps.
          </p>
        </div>
        <Link href="/app/matters/new">
          <Button>
            <Plus className="h-4 w-4" />
            New matter
          </Button>
        </Link>
      </div>

      {matters.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ink-200 bg-white py-16 text-center">
          <p className="text-sm text-ink-500">No matters yet.</p>
          <p className="mt-1 text-xs text-ink-400">
            Start by describing your situation to NyayAI.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matters.map((m) => (
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
    </div>
  );
}
