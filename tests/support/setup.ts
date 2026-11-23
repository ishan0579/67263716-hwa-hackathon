import { loadTestEnv } from "./env";
import { afterAll } from "vitest";

loadTestEnv();
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
process.env.RATE_LIMIT_DISABLED = "1";
delete process.env.STRIPE_SECRET_KEY;

afterAll(async () => {
  const { closeDb } = await import("@/server/db");
  await closeDb();
});
