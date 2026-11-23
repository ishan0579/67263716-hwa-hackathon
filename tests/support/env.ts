import { existsSync } from "node:fs";
import { loadEnvConfig } from "@next/env";

/**
 * Next's env loader ignores .env.local when NODE_ENV=test (as Vitest sets it),
 * so load it explicitly — that's where DATABASE_URL_TEST normally lives.
 */
export function loadTestEnv() {
  loadEnvConfig(process.cwd(), false);
  for (const file of [".env.test.local", ".env.local"]) {
    if (existsSync(file)) {
      try {
        process.loadEnvFile(file);
      } catch {
        /* ignore malformed optional files */
      }
    }
  }
}
