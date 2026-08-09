import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMatterDetail } from "@/lib/matters/service";
import { UploadDocuments } from "@/components/matter/upload-documents";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";

export default async function MatterDocumentsPage({
  params,
}: PageProps<"/app/matters/[id]/documents">) {
  const user = await getCurrentUser();
  if (!user) return notFound();
  const { id } = await params;
  const matter = await getMatterDetail(user.id, id);
  if (!matter) return notFound();

  return (
    <div className="space-y-5">
      <UploadDocuments matterId={id} />

      {matter.documents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ink-200 bg-white py-12 text-center">
          <p className="text-sm text-ink-500">No documents uploaded yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {matter.documents.map((d) => (
            <Link key={d.id} href={`/app/documents/${d.id}`} className="group block border-b border-ink-200 bg-white p-4 first:border-t">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="inline-flex items-center gap-2 text-sm font-medium text-ink-900"><FileText className="h-4 w-4 text-navy-700" />{d.name}</p>
                <Badge tone={d.status === "analyzed" ? "green" : d.status === "processing" ? "amber" : "slate"}>
                  {d.status}
                </Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-400">
                <span>{d.kind}</span>
                {d.mimeType && <span>· {d.mimeType}</span>}
                {d.sizeBytes && <span>· {(d.sizeBytes / 1024).toFixed(0)} KB</span>}
                {d.createdAt && <span>· {format(new Date(d.createdAt), "d MMM yyyy")}</span>}
              </div>
              {d.summary && (
                <p className="mt-2 text-sm text-ink-600">{d.summary}</p>
              )}
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-navy-700 opacity-0 transition-opacity group-hover:opacity-100">Open document <ArrowRight className="h-3 w-3" /></span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
