import "server-only";

/** Reciprocal Rank Fusion of multiple ranked result lists. */
export interface RankedDoc<T> {
  item: T;
  score: number;
  rank: number;
}

interface FusionEntry<T> {
  item: T;
  score: number;
  bestRank: number;
}

/**
 * RRF combines ranked lists: each document earns 1/(k + rank) per list.
 * Deterministic and parameter-free enough for hackathon-grade hybrid ranking.
 */
export function reciprocalRankFusion<T>(
  lists: T[][],
  options: { k?: number; weights?: number[] } = {}
): RankedDoc<T>[] {
  const k = options.k ?? 60;
  const map = new Map<string, FusionEntry<T>>();

  const keyFor = (item: T) => {
    if (item && typeof item === "object" && "id" in item) {
      return `id:${String((item as { id: unknown }).id)}`;
    }
    return `val:${JSON.stringify(item)}`;
  };

  lists.forEach((list, listIndex) => {
    const weight = options.weights?.[listIndex] ?? 1;
    list.forEach((item, rankIndex) => {
      const key = keyFor(item);
      const rank = rankIndex + 1;
      const contribution = weight / (k + rank);
      const existing = map.get(key);
      if (existing) {
        existing.score += contribution;
        if (rank < existing.bestRank) {
          existing.bestRank = rank;
          existing.item = item;
        }
      } else {
        map.set(key, { item, score: contribution, bestRank: rank });
      }
    });
  });

  return [...map.values()]
    .map((entry) => ({ item: entry.item, score: entry.score, rank: entry.bestRank }))
    .sort((a, b) => b.score - a.score);
}

/** Deduplicate by id, keeping the highest score. */
export function dedupeById<T extends { id: string }>(docs: RankedDoc<T>[]): RankedDoc<T>[] {
  const seen = new Map<string, RankedDoc<T>>();
  for (const doc of docs) {
    const existing = seen.get(doc.item.id);
    if (!existing || doc.score > existing.score) {
      seen.set(doc.item.id, doc);
    }
  }
  return [...seen.values()].sort((a, b) => b.score - a.score);
}

/**
 * Lightweight lexical reranker: boost results whose act/section/heading shares
 * tokens with the query. Keeps the pipeline deterministic and fast.
 */
export function rerank<T extends { actName?: string; heading?: string; text?: string }>(
  docs: RankedDoc<T>[],
  query: string,
  boost = 0.1
): RankedDoc<T>[] {
  const tokens = new Set(
    query.toLowerCase().split(/[^a-z0-9]+/i).filter((t) => t.length > 2)
  );
  if (tokens.size === 0) return docs;
  const scored = docs.map((doc) => {
    let boostCount = 0;
    const text = [
      doc.item.actName ?? "",
      doc.item.heading ?? "",
      (doc.item.text ?? "").slice(0, 400),
    ]
      .join(" ")
      .toLowerCase();
    for (const token of tokens) {
      if (text.includes(token)) boostCount += 1;
    }
    return { ...doc, score: doc.score + boostCount * boost };
  });
  return scored.sort((a, b) => b.score - a.score);
}

/** Normalize raw scores to a 0..1 relevance range. */
export function normalizeScores<T>(docs: RankedDoc<T>[]): RankedDoc<T>[] {
  if (docs.length === 0) return docs;
  const max = docs[0].score;
  if (max === 0) return docs.map((d) => ({ ...d, score: 0 }));
  return docs.map((d) => ({ ...d, score: d.score / max }));
}
