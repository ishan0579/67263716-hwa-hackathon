/**
 * Applies pending SQL migrations from ./drizzle. Safe to run repeatedly and in
 * CI/CD before deploys: drizzle records applied migrations in
 * drizzle.__drizzle_migrations and runs each file in a transaction.
 */
import "./_env";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { closeDb, getDb } from "../src/server/db";

async function main() {
  const target = process.argv.includes("--test") ? process.env.DATABASE_URL_TEST : process.env.DATABASE_URL;
  if (!target) throw new Error("Database URL is not configured.");
  process.env.DATABASE_URL = target;
  const db = getDb();
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✓ Migrations applied");
  await closeDb();
}

main().catch(async (err) => {
  console.error("✗ Migration failed:", err);
  await closeDb();
  process.exit(1);
});
