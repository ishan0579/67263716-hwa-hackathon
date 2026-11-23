import { sql } from "drizzle-orm";
import { db } from "./db";
import { hmacHex } from "./crypto";
import { ApiError } from "./http";

type RateResult = { ok: boolean; count: number; resetAt: Date };

/**
 * Fixed-window rate limiter backed by Postgres so limits hold across
 * serverless instances. One atomic upsert per call.
 */
export async function hitRateLimit(bucket: string, identity: string, limit: number, windowSeconds: number): Promise<RateResult> {
  if (process.env.RATE_LIMIT_DISABLED === "1") return { ok: true, count: 0, resetAt: new Date() };
  const key = `${bucket}:${hmacHex(identity).slice(0, 40)}`;
  const rows = await db.execute<{ count: number; reset_at: Date }>(sql`
    INSERT INTO rate_limits (key, count, reset_at)
    VALUES (${key}, 1, now() + make_interval(secs => ${windowSeconds}))
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.reset_at <= now() THEN 1 ELSE rate_limits.count + 1 END,
      reset_at = CASE WHEN rate_limits.reset_at <= now() THEN EXCLUDED.reset_at ELSE rate_limits.reset_at END
    RETURNING count, reset_at
  `);
  const row = rows[0]!;
  // Opportunistic cleanup of stale windows.
  if (Math.random() < 0.02) {
    await db.execute(sql`DELETE FROM rate_limits WHERE reset_at < now() - interval '1 hour'`);
  }
  return { ok: row.count <= limit, count: row.count, resetAt: new Date(row.reset_at) };
}

export async function enforceRateLimit(bucket: string, identity: string, limit: number, windowSeconds: number) {
  const r = await hitRateLimit(bucket, identity, limit, windowSeconds);
  if (!r.ok) {
    const retry = Math.max(1, Math.ceil((r.resetAt.getTime() - Date.now()) / 1000));
    throw new ApiError(429, "rate_limited", `Too many attempts. Please wait ${retry}s and try again.`, {
      retryAfterSeconds: retry,
    });
  }
}
