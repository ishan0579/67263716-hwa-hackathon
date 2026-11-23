/**
 * Creates or resets an administrator.
 *   npm run admin:create -- --email you@example.com --name "Your Name"
 * The password is read from ADMIN_PASSWORD (env) — never pass it on the command
 * line where it would land in shell history.
 */
import "./_env";
import { closeDb, getDb } from "../src/server/db";
import { upsertAdmin } from "../src/server/seed";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email") ?? process.env.ADMIN_EMAIL;
  const name = arg("name") ?? process.env.ADMIN_NAME ?? "Administrator";
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("Provide --email (or ADMIN_EMAIL) and set ADMIN_PASSWORD in the environment.");
  }
  const admin = await upsertAdmin(getDb(), email, password, name);
  console.log(`✓ Administrator ${admin.email} is ready.`);
  await closeDb();
}

main().catch(async (err) => {
  console.error("✗", err instanceof Error ? err.message : err);
  await closeDb();
  process.exit(1);
});
