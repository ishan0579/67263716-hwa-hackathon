import "./_env";
import { closeDb, getDb } from "../src/server/db";
import { seedCatalog, upsertAdmin } from "../src/server/seed";

async function main() {
  if (process.argv.includes("--test")) process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
  const db = getDb();
  const { variantIds } = await seedCatalog(db);
  console.log(`✓ Catalog seeded (${Object.keys(variantIds).length} variants)`);

  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    const admin = await upsertAdmin(db, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME || "Administrator");
    console.log(`✓ Admin ready: ${admin.email}`);
  } else {
    console.log("• ADMIN_EMAIL / ADMIN_PASSWORD not set — skipped admin creation (run `npm run admin:create` later).");
  }
  await closeDb();
}

main().catch(async (err) => {
  console.error("✗ Seed failed:", err);
  await closeDb();
  process.exit(1);
});
