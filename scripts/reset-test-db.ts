/**
 * Resets the TEST database (truncate + migrate + seed). Used by the Playwright
 * global setup. Refuses to run against DATABASE_URL (the development DB).
 */
import { loadTestEnv } from "../tests/support/env";
import { migrate } from "drizzle-orm/postgres-js/migrator";

async function main() {
  loadTestEnv();
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("DATABASE_URL_TEST is required.");
  if (url === process.env.DATABASE_URL) throw new Error("Refusing to reset the development database.");
  process.env.DATABASE_URL = url;
  const { getDb, closeDb } = await import("../src/server/db");
  await migrate(getDb(), { migrationsFolder: "./drizzle" });
  const { resetDatabase } = await import("../tests/support/fixtures");
  await resetDatabase();
  await closeDb();
  console.log("✓ Test database reset");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
