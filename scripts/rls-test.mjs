import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const root = path.resolve(import.meta.dirname, "..");
const databaseUrl = process.env.DATABASE_URL;

const client = databaseUrl
  ? new pg.Client({ connectionString: databaseUrl })
  : new pg.Client({ host: "/var/run/postgresql", user: "postgres", database: "ltp_test" });

async function execFile(file) {
  const sql = await readFile(file, "utf8");
  try {
    await client.query(sql);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const position = error && typeof error === "object" && "position" in error ? error.position : "";
    const where = error && typeof error === "object" && "where" in error ? error.where : "";
    throw new Error(
      `${path.basename(file)} failed: ${message}${position ? ` (position ${position})` : ""}${where ? `\n${where}` : ""}`,
    );
  }
}

async function main() {
  await client.connect();
  await client.query("drop schema if exists public cascade");
  await client.query("drop schema if exists private cascade");
  await client.query("drop schema if exists auth cascade");
  await client.query("drop schema if exists extensions cascade");
  await client.query("create schema public");
  await client.query("grant all on schema public to public");

  const migrations = (await readdir(path.join(root, "supabase/migrations")))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  await execFile(path.join(root, "supabase/tests/00_auth_stub.sql"));
  for (const name of migrations) {
    await execFile(path.join(root, "supabase/migrations", name));
  }
  await execFile(path.join(root, "supabase/tests/rls_and_booking.sql"));
  await client.end();
  console.log("RLS and booking tests passed.");
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  try {
    await client.end();
  } catch {
    // already closed
  }
  process.exit(1);
});
