"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  ScanLine,
  Sparkles,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isImageMime,
  isPdfMime,
  ocrImageFile,
  ocrPdfFile,
} from "./client-ocr";

const ACCEPT = ".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp";
const MAX_BYTES = 15 * 1024 * 1024;
const STAGES = [
  "Uploading document to secure workspace…",
  "Extracting text & formatting structure…",
  "Scrubbing PII & classifying legal nature…",
  "Analyzing clauses, obligations & hidden risks…",
];

type Phase = "idle" | "uploading" | "ocr" | "analyzing" | "done" | "error";

export function DocumentUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [stage, setStage] = useState(0);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const pickFile = useCallback((f: File | null | undefined) => {
    setError(null);
    if (!f) return;
    if (f.size > MAX_BYTES) {
      setError("File is too large (max 15MB).");
      return;
    }
    setFile(f);
    setPhase("idle");
  }, []);

  async function runClientOcr(f: File): Promise<string> {
    if (isImageMime(f.type)) return ocrImageFile(f, setOcrProgress);
    if (isPdfMime(f.type, f.name)) return ocrPdfFile(f, setOcrProgress);
    return "";
  }

  async function pollAnalysis(id: string) {
    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, 1200));
      try {
        const res = await fetch(`/api/documents/${id}/analysis`, { cache: "no-store" });
        const data = await res.json();
        if (data.status === "done") return true;
        if (data.status === "failed") {
          setError(data.error ?? "Analysis failed.");
          return false;
        }
        if (typeof data.progress === "number") {
          setStage(Math.min(3, Math.floor(data.progress / 25)));
        }
      } catch {
        // transient network error — keep polling
      }
    }
    setError("Analysis is taking longer than expected. You can open the document from your list.");
    return false;
  }

  async function start() {
    if (!file || phase === "uploading" || phase === "analyzing" || phase === "ocr") return;
    setPhase("uploading");
    setStage(0);
    setError(null);

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/documents/upload", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
        setPhase("error");
        return;
      }

      let documentId = data.document.id as string;

      if (data.document.needsOcr) {
        // Server couldn't extract text — run browser-side OCR and resubmit as .txt
        setPhase("ocr");
        setOcrProgress(0);
        try {
          const text = await runClientOcr(file);
          if (!text || text.replace(/\s/g, "").length < 20) {
            setError(
              "We couldn't read this document. If it is a scan, try a higher-resolution image or a text-based PDF."
            );
            setPhase("error");
            return;
          }
          const ocrFile = new File(
            [text],
            `${file.name.replace(/\.[^.]+$/, "")} (OCR).txt`,
            { type: "text/plain" }
          );
          const ocrForm = new FormData();
          ocrForm.append("file", ocrFile);
          const ocrRes = await fetch("/api/documents/upload", {
            method: "POST",
            body: ocrForm,
          });
          const ocrData = await ocrRes.json();
          if (!ocrRes.ok) {
            setError(ocrData.error ?? "OCR upload failed.");
            setPhase("error");
            return;
          }
          documentId = ocrData.document.id;
        } catch (ocrErr) {
          setError(
            ocrErr instanceof Error
              ? `Browser OCR failed: ${ocrErr.message}`
              : "Browser OCR failed. Please try a text-based PDF or DOCX."
          );
          setPhase("error");
          return;
        }
      }

      setPhase("analyzing");
      setStage(1);
      fetch(`/api/documents/${documentId}/analyze`, { method: "POST" }).catch(() => {});
      const ok = await pollAnalysis(documentId);

      if (ok) {
        setPhase("done");
        router.push(`/app/documents/${documentId}`);
        router.refresh();
      } else {
        setPhase("error");
      }
    } catch {
      setError("Network error during document analysis. Please try again.");
      setPhase("error");
    }
  }

  return (
    <div className="space-y-4">
      {/* Drag & Drop Target Area */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pickFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed p-8 sm:p-10 text-center transition-all",
          dragging
            ? "border-foreground bg-[#f2efe7]"
            : "border-border bg-white hover:border-foreground/60 hover:bg-[#fcfbf9] shadow-2xs"
        )}
      >
        <div className="size-11 rounded-full bg-paper-warm flex items-center justify-center text-foreground border border-border">
          <Upload className="h-5 w-5 text-foreground" />
        </div>
        <div>
          <span className="text-sm font-semibold text-foreground block">
            Drag & drop a legal document, or browse
          </span>
          <span className="text-xs text-muted-foreground mt-0.5 block">
            Rental agreements, employment contracts, notices, FIRs & petitions (PDF, DOCX, TXT · max 15MB)
          </span>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => pickFile(e.target.files?.[0])}
      />

      {/* Selected File Card with Prominent Action */}
      {file && (
        <div className="space-y-4 rounded-xl border border-border bg-white p-5 shadow-xs transition-all">
          <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-9 rounded-lg bg-paper-warm flex items-center justify-center border border-border shrink-0">
                <FileText className="h-4 w-4 text-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{file.name}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(0)} KB · Ready for AI risk & clause extraction
                </p>
              </div>
            </div>

            {phase === "idle" && (
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-paper-warm transition-colors"
                title="Remove file"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* OCR Progress */}
          {phase === "ocr" && (
            <div className="space-y-3 bg-[#faf9f6] p-4 rounded-lg border border-border/80">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <ScanLine className="size-3.5 animate-pulse text-foreground" />
                  Scanning document with on-device OCR
                </span>
                <span className="text-muted-foreground">
                  {Math.round(ocrProgress * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground transition-all duration-500 rounded-full"
                  style={{ width: `${Math.max(5, ocrProgress * 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                First run downloads the OCR engine (~10MB). Subsequent scans are faster.
              </p>
            </div>
          )}

          {/* Progress Steps during Upload & Analysis */}
          {(phase === "uploading" || phase === "analyzing") && (
            <div className="space-y-3 bg-[#faf9f6] p-4 rounded-lg border border-border/80">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin text-foreground" />
                  Processing Document
                </span>
                <span className="text-muted-foreground">Stage {stage + 1} of {STAGES.length}</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground transition-all duration-500 rounded-full"
                  style={{ width: `${((stage + 1) / STAGES.length) * 100}%` }}
                />
              </div>

              <ol className="space-y-2 pt-1">
                {STAGES.map((label, i) => (
                  <li key={label} className="flex items-center gap-2 text-xs">
                    {i < stage ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                    ) : i === stage ? (
                      <span className="size-3.5 rounded-full border-2 border-foreground border-t-transparent animate-spin shrink-0" />
                    ) : (
                      <span className="size-1.5 rounded-full bg-border shrink-0 ml-1 mr-1" />
                    )}
                    <span className={cn(i <= stage ? "text-foreground font-medium" : "text-muted-foreground/60")}>
                      {label}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Action Buttons when Idle */}
          {phase === "idle" && (
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={start}
                className="btn-solid text-xs sm:text-sm py-2 px-4 rounded-lg font-semibold inline-flex items-center gap-2 cursor-pointer shadow-xs hover:scale-[1.01] transition-transform"
              >
                <Sparkles className="size-4 text-amber-300" />
                <span>Start Legal Analysis</span>
                <ArrowRight className="size-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="btn-outline text-xs sm:text-sm py-2 px-3.5 rounded-lg font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Done Banner */}
      {phase === "done" && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs sm:text-sm text-emerald-900 font-medium">
          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          <span>Analysis complete! Redirecting to the interactive report…</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs sm:text-sm text-red-900">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <div className="space-y-1">
            <span className="font-semibold block">Analysis could not be completed</span>
            <span className="text-red-700 block text-xs">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
}
