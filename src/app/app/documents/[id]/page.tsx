import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { format } from "date-fns";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { documentEntities, documents, matters } from "@/lib/db/schema";

export default async function DocumentReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(); if (!user) return notFound(); const { id } = await params;
  const rows = await db.select({ document: documents, matterTitle: matters.title }).from(documents).leftJoin(matters, eq(documents.matterId, matters.id)).where(and(eq(documents.id, id), eq(documents.userId, user.id))).limit(1);
  if (!rows.length) return notFound(); const { document, matterTitle } = rows[0];
  const entities = await db.select().from(documentEntities).where(eq(documentEntities.documentId, id));
  const grouped = entities.reduce((map, entity) => {
    const current = map.get(entity.kind) ?? [];
    current.push(entity);
    map.set(entity.kind, current);
    return map;
  }, new Map<string, typeof entities>());
  return <div className="workspace-page !max-w-[100rem]"><Link href={document.matterId ? `/app/matters/${document.matterId}/documents` : "/app/documents"} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-navy-950"><ArrowLeft className="h-3.5 w-3.5" /> Back to documents</Link><header className="mt-6 border-b border-ink-200 pb-5"><p className="eyebrow">{matterTitle ?? "Document record"}</p><h1 className="mt-2 font-serif-display text-3xl text-navy-950">{document.name}</h1><p className="mt-2 text-xs text-ink-500">{document.kind.replaceAll("_", " ")} · {document.mimeType ?? "Unknown file type"} · added {format(new Date(document.createdAt), "d MMM yyyy")}</p></header><div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1fr)_23rem]"><article className="document-surface min-h-[55rem] p-6 sm:p-10"><div className="mx-auto max-w-3xl">{document.extractedText ? <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-ink-800">{document.extractedText}</pre> : <div className="grid min-h-96 place-items-center text-center"><div><FileText className="mx-auto h-7 w-7 text-ink-400" /><p className="mt-4 text-sm text-ink-500">No readable text was extracted from this file.</p></div></div>}</div></article><aside className="space-y-5 xl:sticky xl:top-6 xl:self-start"><ContextSection title="Summary">{document.summary ? <p className="text-sm leading-6 text-ink-700">{document.summary}</p> : <p className="text-sm text-ink-400">No summary available.</p>}</ContextSection>{Array.from(grouped.entries()).map(([kind, items]) => <ContextSection key={kind} title={kind.replaceAll("_", " ")}><ul className="space-y-2">{items.map((item) => <li key={item.id} className="border-l-2 border-ink-200 pl-3 text-sm text-ink-700">{item.value}</li>)}</ul></ContextSection>)}</aside></div></div>;
}
function ContextSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="border border-ink-200 bg-white p-5"><h2 className="eyebrow text-navy-700">{title}</h2><div className="mt-3">{children}</div></section>; }
