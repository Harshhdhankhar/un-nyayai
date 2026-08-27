import { describe, it, expect } from "vitest";
import zlib from "node:zlib";
import { extractDocument } from "@/lib/documents/service";

/**
 * Regression guard for the PDF text-extraction pipeline.
 *
 * pdfjs-dist v6's legacy build evaluates `new DOMMatrix()` at import time, which
 * only works in Node when a native canvas addon is present. When that import
 * throws, extraction silently falls back to a regex scraper that finds nothing
 * in *compressed* PDF streams — i.e. virtually every real-world PDF. These tests
 * exercise a FlateDecode-compressed PDF so the regex fallback is provably
 * insufficient and only a working pdfjs import can satisfy them.
 */

/** Build a minimal single-page PDF whose text lives in a FlateDecode stream. */
function makeCompressedPdf(text: string): Buffer {
  const enc = (s: string) => Buffer.from(s, "latin1");
  const content = `BT /F1 24 Tf 72 700 Td (${text}) Tj ET`;
  const stream = zlib.deflateSync(Buffer.from(content, "latin1"));

  const objects = [
    "1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n",
    "2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n",
    "3 0 obj\n<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>\nendobj\n",
    "4 0 obj\n<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>\nendobj\n",
  ];

  let pdf = enc("%PDF-1.5\n");
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf = Buffer.concat([pdf, enc(obj)]);
  }
  offsets.push(pdf.length);
  pdf = Buffer.concat([
    pdf,
    enc(`5 0 obj\n<</Length ${stream.length}/Filter/FlateDecode>>\nstream\n`),
    stream,
    enc("\nendstream\nendobj\n"),
  ]);

  const xrefStart = pdf.length;
  let xref = "xref\n0 6\n0000000000 65535 f \n";
  for (const off of offsets) xref += `${String(off).padStart(10, "0")} 00000 n \n`;
  xref += `trailer\n<</Size 6/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.concat([pdf, enc(xref)]);
}

describe("extractDocument — PDF", () => {
  it("extracts text from a FlateDecode-compressed PDF (guards the DOMMatrix import regression)", async () => {
    const buf = makeCompressedPdf("Rental Agreement between the parties");

    // Sanity: the raw-buffer regex fallback finds no literal strings here, so a
    // passing assertion below can only come from a working pdfjs parse.
    const literalGroups = buf.toString("latin1").match(/\(([^()\\]|\\.)*\)/g) ?? [];
    expect(literalGroups.length).toBe(0);

    const result = await extractDocument("application/pdf", "agreement.pdf", buf);
    expect(result).not.toBeNull();
    expect(result!.text).toContain("Rental Agreement between the parties");
    expect(result!.pageOffsets.length).toBeGreaterThanOrEqual(1);
  });

  it("routes by extension when the mime type is generic", async () => {
    const buf = makeCompressedPdf("Employment Agreement clause one");
    const result = await extractDocument("application/octet-stream", "contract.pdf", buf);
    expect(result!.text).toContain("Employment Agreement clause one");
  });
});

describe("extractDocument — TXT", () => {
  it("returns plain text with a single page offset", async () => {
    const buf = Buffer.from("This is a simple legal note.", "utf-8");
    const result = await extractDocument("text/plain", "note.txt", buf);
    expect(result).toEqual({ text: "This is a simple legal note.", pageOffsets: [0] });
  });
});

describe("extractDocument — unsupported", () => {
  it("returns null for an unknown type", async () => {
    const result = await extractDocument("image/png", "scan.png", Buffer.from([0x89, 0x50]));
    expect(result).toBeNull();
  });
});
