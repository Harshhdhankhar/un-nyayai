import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { FileText, FolderOpen } from "lucide-react";
import { format } from "date-fns";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { documents, matters } from "@/lib/db/schema";
import { DocumentUploader } from "@/components/documents/document-uploader";

export default async function DocumentsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const rows = await db
    .select({ document: documents, matterTitle: matters.title })
    .from(documents)
    .leftJoin(matters, eq(documents.matterId, matters.id))
    .where(eq(documents.userId, user.id))
    .orderBy(desc(documents.createdAt));

  return (
    <div className="workspace-page !max-w-[64rem]">
      <header className="max-w-3xl">
        <p className="eyebrow text-navy-700">Legal Document Analyzer</p>
        <h1 className="mt-3 font-serif-display text-4xl text-navy-950 sm:text-5xl">Documents</h1>
        <p className="mt-3 text-sm leading-6 text-ink-600">
          Upload a contract, rental agreement, employment letter, legal notice, FIR and more. NyayAI
          extracts the text, classifies the document, detects personal information, analyses clauses
          and flags potential risks — then lets you interrogate the file in plain words.
        </p>
      </header>

      <div className="mt-8">
        <DocumentUploader />
      </div>

      {rows.length ? (
        <div className="mt-10 border-t border-ink-300">
          {rows.map(({ document, matterTitle }) => (
            <Link
              key={document.id}
              href={`/app/documents/${document.id}`}
              className="group grid gap-3 border-b border-ink-200 py-5 transition-colors hover:bg-white sm:grid-cols-[2rem_1fr_8rem_7rem] sm:items-center sm:px-3"
            >
              <FileText className="h-5 w-5 text-navy-700" />
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-navy-950 group-hover:underline">
                  {document.name}
                </h2>
                <p className="mt-1 truncate text-xs text-ink-500">
                  {matterTitle ?? "Standalone document"} · {document.kind.replaceAll("_", " ")}
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-verified-700">
                {document.status}
              </span>
              <time className="text-xs text-ink-400">
                {format(new Date(document.createdAt), "d MMM yyyy")}
              </time>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-10 border border-dashed border-ink-300 py-16 text-center">
          <FolderOpen className="mx-auto h-6 w-6 text-ink-400" />
          <p className="mt-4 text-sm text-ink-600">
            No documents have been added yet. Upload your first document above to see a full analysis
            report.
          </p>
        </div>
      )}
    </div>
  );
}
