import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;
/** Either the root db or a transaction handle — services accept both. */
export type DbOrTx = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

type DbGlobal = { __snifforbitSql?: postgres.Sql; __snifforbitDb?: Db; __snifforbitUrl?: string };
const g = globalThis as unknown as DbGlobal;

/**
 * Lazily creates a single connection pool per process (and re-uses it across
 * hot reloads in development). `prepare: false` keeps us compatible with
 * transaction-mode poolers such as Neon / Supabase PgBouncer endpoints.
 */
export function getDb(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured. Copy .env.example to .env.local.");
  }
  if (g.__snifforbitDb && g.__snifforbitUrl === url) return g.__snifforbitDb;

  const client = postgres(url, {
    max: process.env.VERCEL ? 3 : 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    onnotice: () => {},
  });
  g.__snifforbitSql = client;
  g.__snifforbitUrl = url;
  g.__snifforbitDb = drizzle(client, { schema, casing: undefined });
  return g.__snifforbitDb;
}

/** Proxy so modules can `import { db }` without connecting at import time. */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<PropertyKey, unknown>;
    const value = real[prop];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(real) : value;
  },
});

export async function closeDb() {
  if (g.__snifforbitSql) {
    await g.__snifforbitSql.end({ timeout: 5 });
    g.__snifforbitSql = undefined;
    g.__snifforbitDb = undefined;
    g.__snifforbitUrl = undefined;
  }
}

export { schema };
