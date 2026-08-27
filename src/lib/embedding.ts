import "server-only";
import { config, hasEmbeddingApi } from "@/lib/config";
import { logger } from "@/lib/logger";
import crypto from "node:crypto";

/**
 * Embedding provider.
 * Uses an OpenAI-compatible embeddings endpoint when configured; otherwise
 * falls back to a deterministic local hashing embedder (offline, approximate —
 * clearly labelled as such in retrieval metadata). This keeps the pipeline
 * fully functional without any external credentials.
 */

export interface EmbeddingResult {
  vector: number[];
  provider: "api" | "local";
}

async function embedViaApi(text: string): Promise<number[]> {
  const url = `${config.embedding.baseUrl}/embeddings`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.embedding.apiKey}`,
    },
    body: JSON.stringify({
      model: config.embedding.model,
      input: text,
    }),
  });
  if (!res.ok) {
    throw new Error(`Embeddings API failed (${res.status}).`);
  }
  const data = (await res.json()) as { data?: { embedding?: number[] }[] };
  const vector = data.data?.[0]?.embedding;
  if (!vector) throw new Error("Empty embedding response.");
  return vector;
}

/**
 * Local hashing embedder: character n-gram hashing into a fixed-dim vector.
 * Deterministic and offline. Good enough for demo-grade semantic similarity.
 */
export function localEmbed(text: string, dim = config.embedding.dim): number[] {
  const vector = new Float64Array(dim);
  const normalized = text.toLowerCase().replace(/\s+/g, " ");
  const grams: string[] = [];
  const words = normalized.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  for (const word of words) {
    if (word.length >= 2) grams.push(word);
    if (word.length >= 5) {
      for (let i = 0; i <= word.length - 3; i++) {
        grams.push(word.slice(i, i + 3));
      }
    }
  }
  // add whole-string hash component so identical text maps close
  const whole = crypto.createHash("sha256").update(normalized).digest();
  for (let i = 0; i < 8; i++) {
    const idx = whole[i] % dim;
    vector[idx] += 1;
  }
  for (const gram of grams) {
    const hash = crypto.createHash("sha256").update(gram).digest();
    const sign = hash[0] % 2 === 0 ? 1 : -1;
    const bucket = hash.readUInt32BE(1) % dim;
    vector[bucket] += sign;
  }
  // L2 normalize
  let norm = 0;
  for (const v of vector) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  const out = Array.from(vector, (v) => v / norm);
  return out;
}

export async function embed(text: string): Promise<EmbeddingResult> {
  if (hasEmbeddingApi) {
    try {
      const vector = await embedViaApi(text);
      // The DB columns are vector(dim). A provider returning a different
      // dimension would silently corrupt similarity comparability — reject it.
      if (vector.length !== config.embedding.dim) {
        throw new Error(
          `Embedding dimension mismatch: got ${vector.length}, expected ${config.embedding.dim}.`
        );
      }
      return { vector, provider: "api" };
    } catch (err) {
      logger.warn("embedding_api_fallback", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return { vector: localEmbed(text), provider: "local" };
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
