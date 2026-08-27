import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";
import { AnalysisDashboard } from "@/components/documents/analysis-dashboard";

export default async function DocumentReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return notFound();
  const { id } = await params;

  const rows = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, user.id)))
    .limit(1);
  if (!rows.length) return notFound();
  const doc = rows[0];

  return (
    <AnalysisDashboard
      documentId={doc.id}
      initialDoc={{
        id: doc.id,
        name: doc.name,
        kind: doc.kind,
        mimeType: doc.mimeType,
        status: doc.status,
        pageCount: Array.isArray(doc.pageOffsets) ? doc.pageOffsets.length : null,
        createdAt: doc.createdAt.toISOString(),
      }}
    />
  );
}
