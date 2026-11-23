import { execSync } from "node:child_process";

/** Resets and re-seeds the TEST database before the E2E run (see scripts/reset-test-db.ts). */
export default async function globalSetup() {
  execSync("npx tsx scripts/reset-test-db.ts", { stdio: "inherit" });
}
