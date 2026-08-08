"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";

export function UploadDocuments({ matterId }: { matterId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
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
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch {
      setError("Network error while uploading.");
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
        className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-ink-200 bg-white px-4 py-10 text-center transition-colors hover:border-navy-700"
      >
        <Upload className="h-6 w-6 text-ink-400" />
        <span className="text-sm font-medium text-ink-700">
          Upload documents
        </span>
        <span className="text-xs text-ink-400">
          PDF, text, images (OCR-ready), Word. Max 15MB each.
        </span>
      </button>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between rounded-md border border-ink-200 bg-white px-3 py-2 text-sm">
              <span className="truncate text-ink-700">{f.name}</span>
              <span className="ml-2 shrink-0 text-xs text-ink-400">
                {(f.size / 1024).toFixed(0)} KB
              </span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" onClick={upload} loading={uploading}>
              {uploading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
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
        </div>
      )}

      {error && (
        <p className="rounded-md bg-critical-100 px-3 py-2 text-sm text-critical-600">
          {error}
        </p>
      )}
    </div>
  );
}
