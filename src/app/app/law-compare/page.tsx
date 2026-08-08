import { eq, ilike, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { lawMappings } from "@/lib/db/schema";
import { LawCompare } from "@/components/law-compare/law-compare";

export const metadata = { title: "Law compare" };

export default async function LawComparePage() {
  const all = await db
    .select()
    .from(lawMappings)
    .where(eq(lawMappings.pair, "ipc_bns"))
    .orderBy(lawMappings.oldSection);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy-950">
          Law compare
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          New criminal laws replaced old codes on 1 July 2024. Look up how an
          old IPC section maps to the Bharatiya Nyaya Sanhita.
        </p>
      </div>
      <LawCompare mappings={all} />
    </div>
  );
}
