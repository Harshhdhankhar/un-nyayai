import "server-only";

/**
 * Server-side configuration. Never import this from client components —
 * keys are accessed via process.env and stay server-only.
 */

function env(key: string, fallback?: string): string | undefined {
  const value = process.env[key];
  return value && value.length > 0 ? value : fallback;
}

export const config = {
  appUrl: env("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
  databaseUrl: env("DATABASE_URL", "postgres://localhost:5432/nyayi"),
  authSecret: env("AUTH_SECRET", ""),

  // AI
  aiMode: (env("AI_MODE", "auto") ?? "auto") as "auto" | "mock",
  groq: {
    apiKey: env("GROQ_API_KEY"),
    model: env("GROQ_MODEL", "llama-3.3-70b-versatile"),
    baseUrl: env("GROQ_BASE_URL", "https://api.groq.com/openai/v1"),
    timeoutMs: 45_000,
  },

  // Embeddings (optional; local hashing fallback used when absent)
  embedding: {
    apiKey: env("OPENAI_EMBEDDING_API_KEY"),
    baseUrl: env("OPENAI_EMBEDDING_BASE_URL", "https://api.openai.com/v1"),
    model: env("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"),
    dim: Number(env("EMBEDDING_DIM", "1536") ?? "1536"),
  },

  // Indian Kanoon
  indianKanoon: {
    apiKey: env("INDIAN_KANOON_API_KEY"),
    baseUrl: env("INDIAN_KANOON_BASE_URL", "https://api.indiankanoon.org"),
    timeoutMs: 20_000,
  },

  // eCourts
  ecourts: {
    apiKey: env("ECOURTS_API_KEY"),
    baseUrl: env("ECOURTS_BASE_URL", "https://webapi.ecourtsindia.com"),
    username: env("ECOURTS_USERNAME"),
    password: env("ECOURTS_PASSWORD"),
    timeoutMs: 25_000,
  },

  // Legal NLP microservice
  legalNlpUrl: env("LEGAL_NLP_URL"),

  logLevel: (env("LOG_LEVEL", "info") ?? "info") as
    | "debug"
    | "info"
    | "warn"
    | "error",
} as const;

export const hasGroq = Boolean(config.groq.apiKey);
export const hasIndianKanoon = Boolean(config.indianKanoon.apiKey);
export const hasEcourts = Boolean(config.ecourts.apiKey && config.ecourts.baseUrl);
export const hasEmbeddingApi = Boolean(config.embedding.apiKey);
export const hasLegalNlp = Boolean(config.legalNlpUrl);
export const isMockAiMode = config.aiMode === "mock";
export const canUseAi = hasGroq && !isMockAiMode;
