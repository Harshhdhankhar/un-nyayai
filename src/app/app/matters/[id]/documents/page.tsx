import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMatterDetail } from "@/lib/matters/service";
import { UploadDocuments } from "@/components/matter/upload-documents";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

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
            <div key={d.id} className="rounded-md border border-ink-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-ink-900">{d.name}</p>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
