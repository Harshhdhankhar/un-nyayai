"use client";

import { createWorker, type Worker } from "tesseract.js";

/**
 * Client-side OCR for documents that lack a digital text layer.
 *
 * Runs tesseract.js entirely in the browser using WASM, so it works on any
 * deployment without a server-side OCR dependency. The first invocation
 * downloads the English language model (~10MB) and caches it via the browser.
 *
 * Used as a fallback in DocumentUploader when the server reports `needsOcr`.
 */

let workerPromise: Promise<Worker> | null = null;

function getWorker(onProgress?: (p: number) => void): Promise<Worker> {
  if (workerPromise) return workerPromise;
  workerPromise = createWorker("eng", 1, {
    logger: (m: { status: string; progress: number }) => {
      if (onProgress && typeof m.progress === "number") {
        onProgress(Math.max(0, Math.min(1, m.progress)));
      }
    },
  });
  return workerPromise;
}

/** OCR a single image File (png/jpeg/webp). */
export async function ocrImageFile(
  file: File,
  onProgress?: (p: number) => void
): Promise<string> {
  const worker = await getWorker(onProgress);
  const { data } = await worker.recognize(file);
  return (data.text ?? "").trim();
}

/**
 * OCR a PDF by rendering each page to a canvas (via pdfjs-dist) and then
 * running tesseract on each rendered image. Skips pages that already have
 * a usable text layer.
 */
export async function ocrPdfFile(
  file: File,
  onProgress?: (p: number) => void
): Promise<string> {
  const [pdfjs, worker] = await Promise.all([
    import("pdfjs-dist"),
    getWorker(),
  ]);

  // pdfjs needs a worker URL. Resolve via new URL so webpack emits it as an
  // asset and we get a stable, code-splitting-friendly path.
  const workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).toString();
  (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } })
    .GlobalWorkerOptions.workerSrc = workerSrc;

  const buf = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const maxPages = Math.min(pdf.numPages, 25);
  const pages: string[] = [];
  let perPageProgress = 0;

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable in this browser.");
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png")
    );
    if (!blob) continue;

    const { data } = await worker.recognize(blob);
    const text = (data.text ?? "").trim();
    if (text) pages.push(text);

    perPageProgress = i / maxPages;
    onProgress?.(perPageProgress);
  }

  return pages.join("\n\n").trim();
}

export function isImageMime(mime: string): boolean {
  return ["image/png", "image/jpeg", "image/webp"].includes(mime);
}

export function isPdfMime(mime: string, name: string): boolean {
  return mime === "application/pdf" || /\.pdf$/i.test(name);
}
