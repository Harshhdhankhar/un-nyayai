import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://localhost:5432/nyayi";

declare global {
  // eslint-disable-next-line no-var
  var __nyayiDb: ReturnType<typeof createClient> | undefined;
}

function createClient() {
  const client = postgres(connectionString, {
    max: 10,
    onnotice: () => {},
  });
  return drizzle(client, { schema });
}

// Reuse a single connection pool across hot reloads in dev.
export const db = globalThis.__nyayiDb ?? createClient();
if (process.env.NODE_ENV !== "production") {
  globalThis.__nyayiDb = db;
}

export type DB = typeof db;
