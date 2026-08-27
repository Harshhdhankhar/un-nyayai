"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Upload, XCircle } from "lucide-react";

type UploadOutcome = { name: string; status: "processed" | "failed"; note?: string };

const PIPELINE = ["Uploading", "Extracting text", "Identifying facts & issues", "Linking to the Matter"];

export function UploadDocuments({ matterId }: { matterId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<UploadOutcome[]>([]);

  async function upload() {
    if (files.length === 0 || uploading) return;
    setUploading(true);
    setError(null);
    setOutcomes([]);
    const form = new FormData();
    for (const f of files) form.append("files", f);
    try {
      const res = await fetch(`/api/matters/${matterId}/documents`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
        return;
      }
      const next: UploadOutcome[] = [
        ...(data.results ?? []).map((r: { name: string }) => ({ name: r.name, status: "processed" as const })),
        ...(data.errors ?? []).map((e: { name: string; error: string }) => ({ name: e.name, status: "failed" as const, note: e.error })),
      ];
      setOutcomes(next);
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
      if (data.results?.length) router.refresh();
    } catch {
      setError("Network error while uploading. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.txt,.png,.jpg,.jpeg,.webp,.doc,.docx"
        className="hidden"
        onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-ink-200 bg-white px-4 py-10 text-center transition-colors hover:border-navy-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Upload className="h-6 w-6 text-ink-400" />
        <span className="text-sm font-medium text-ink-700">Upload documents</span>
        <span className="text-xs text-ink-400">PDF, text, images (OCR-ready), Word. Max 15MB each.</span>
      </button>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between rounded-md border border-ink-200 bg-white px-3 py-2 text-sm">
              <span className="truncate text-ink-700">{f.name}</span>
              <span className="ml-2 shrink-0 text-xs text-ink-400">{(f.size / 1024).toFixed(0)} KB</span>
            </div>
          ))}

          {uploading ? (
            <div className="rounded-md border border-ink-200 bg-white p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-navy-950">
                <Loader2 className="h-4 w-4 animate-spin" /> Processing {files.length} file{files.length > 1 ? "s" : ""}
              </p>
              <ol className="mt-3 space-y-1.5">
                {PIPELINE.map((step, i) => (
                  <li key={step} className="flex items-center gap-2 text-xs text-ink-500">
                    <span className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-navy-700" : "bg-ink-200"}`} />
                    {step}
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-[11px] text-ink-400">Large files can take a moment while text is extracted and analysed.</p>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" onClick={upload}>
                <Upload className="h-3.5 w-3.5" />
                Upload {files.length} file{files.length > 1 ? "s" : ""}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setFiles([]);
                  if (inputRef.current) inputRef.current.value = "";
                }}
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      )}

      {outcomes.length > 0 && (
        <div className="divide-y divide-ink-100 rounded-md border border-ink-200 bg-white">
          {outcomes.map((o) => (
            <div key={`${o.name}-${o.status}`} className="flex items-start gap-2 px-3 py-2 text-sm">
              {o.status === "processed" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-verified-700" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-critical-600" />
              )}
              <span className="min-w-0">
                <span className="block truncate text-ink-800">{o.name}</span>
                {o.note ? <span className="block text-xs text-critical-600">{o.note}</span> : null}
              </span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="rounded-md bg-critical-100 px-3 py-2 text-sm text-critical-600">{error}</p>
      )}
    </div>
  );
}
