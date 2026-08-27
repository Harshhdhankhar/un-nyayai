/**
 * db-doctor — diagnose the schema-drift behind the /api/documents/upload 500.
 *
 * Resolves the database URL EXACTLY as the app does (src/lib/db/client.ts:
 *   process.env.DATABASE_URL ?? "postgres://localhost:5432/nyayi"
 * ) and reports which database it actually reaches, whether
 * documents.page_offsets exists, and what Drizzle's migration table records.
 *
 * IMPORTANT: run this in the SAME shell you use for `npm run dev`, so it sees
 * the same DATABASE_URL the running server sees (a shell `export` overrides
 * .env for both).
 *
 *   npx tsx scripts/db-doctor.ts          # report only
 *   npx tsx scripts/db-doctor.ts --fix    # also ADD COLUMN IF NOT EXISTS page_offsets
 */
import "dotenv/config";
import postgres from "postgres";

const APP_DEFAULT = "postgres://localhost:5432/nyayi";
const url = process.env.DATABASE_URL ?? APP_DEFAULT;
const fromShellEnv = typeof process.env.DATABASE_URL === "string";
const redacted = url.replace(/(postgres(ql)?:\/\/)([^:/@]+)(:[^@]*)?@/, "$1$3:***@");
const wantFix = process.argv.includes("--fix");

async function main() {
  console.log("── db-doctor ───────────────────────────────────────────");
  console.log("Resolved DATABASE_URL :", redacted);
  console.log("Source                :", fromShellEnv ? "process.env (shell export — overrides .env!)" : "fallback/.env default");

  const sql = postgres(url, { max: 1, connect_timeout: 6, onnotice: () => {} });
  try {
    const [info] = await sql`
      select current_database() as db,
             coalesce(host(inet_server_addr()), 'local-socket') as host,
             inet_server_port() as port,
             current_user as usr`;
    console.log("Connected database    :", info.db);
    console.log("Server host:port      :", `${info.host}:${info.port}`);
    console.log("Connected as user     :", info.usr);

    const cols = await sql<{ column_name: string }[]>`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'documents'
      order by ordinal_position`;
    const hasPageOffsets = cols.some((c) => c.column_name === "page_offsets");
    console.log("\ndocuments columns     :", cols.map((c) => c.column_name).join(", "));
    console.log("page_offsets present  :", hasPageOffsets ? "YES ✓" : "NO ✗  <-- this causes the insert 500");

    // Drizzle records applied migrations in schema "drizzle", table __drizzle_migrations.
    const migs = await sql<{ hash: string; created_at: string }[]>`
      select hash, to_char(to_timestamp(created_at/1000), 'YYYY-MM-DD HH24:MI:SS') as created_at
      from drizzle.__drizzle_migrations order by created_at`.catch(() => []);
    console.log("\nRecorded migrations   :", migs.length);
    for (const m of migs) console.log("  •", m.created_at, m.hash.slice(0, 12));
    console.log(
      migs.length >= 5
        ? "  (5+ recorded — Drizzle believes 0004 is applied, so `db:migrate` will NO-OP even if the column is missing)"
        : "  (fewer than 5 — run `npm run db:migrate` to apply pending migrations)"
    );

    if (!hasPageOffsets && wantFix) {
      console.log("\nApplying: ALTER TABLE documents ADD COLUMN IF NOT EXISTS page_offsets jsonb;");
      await sql`alter table documents add column if not exists page_offsets jsonb`;
      console.log("Done ✓  — restart `npm run dev` and retry the upload.");
    } else if (!hasPageOffsets) {
      console.log("\nFix: re-run with  npx tsx scripts/db-doctor.ts --fix");
    } else {
      console.log("\nSchema looks correct. If uploads still 500, the running server is on a DIFFERENT");
      console.log("DATABASE_URL than this script — compare `echo $DATABASE_URL` in the dev-server shell.");
    }
  } catch (err) {
    const e = err as { code?: string; message?: string };
    console.error("\nCould not query the database:", e.code || e.message);
    console.error("If this is ECONNREFUSED, nothing is listening at the resolved URL above.");
  } finally {
    await sql.end({ timeout: 3 });
  }
}

void main();
