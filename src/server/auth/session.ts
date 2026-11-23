import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "../db";
import { adminSessions, adminUsers } from "../db/schema";
import { hmacHex } from "../crypto";
import { ApiError } from "../http";

/**
 * Database-backed admin sessions.
 *  - The cookie holds a random 256-bit token; the DB stores only HMAC(secret, token).
 *  - Cookies are httpOnly, SameSite=Lax, Secure in production, `__Host-` prefixed.
 *  - Sessions expire after 7 days and slide while in use.
 */
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RENEW_AFTER_MS = 60 * 60 * 1000;

export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-so_admin" : "so_admin";

export type AdminIdentity = { id: string; email: string; name: string; sessionId: string };

export async function createAdminSession(adminUserId: string, userAgent: string | null) {
  const token = randomBytes(32).toString("base64url");
  const id = hmacHex(`session:${token}`);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(adminSessions).values({
    id,
    adminUserId,
    expiresAt,
    userAgent: userAgent?.slice(0, 300) ?? null,
  });
  // Housekeeping: drop expired sessions for this admin.
  await db
    .delete(adminSessions)
    .where(and(eq(adminSessions.adminUserId, adminUserId), lt(adminSessions.expiresAt, new Date())));
  return { token, expiresAt };
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

function readCookie(req: Request, name: string) {
  const raw = (req.headers.get("cookie") ?? "")
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  return raw ? decodeURIComponent(raw) : null;
}

/** Resolves a raw token to an active admin, or null. Exported for tests. */
export async function resolveSessionToken(token: string | undefined | null): Promise<AdminIdentity | null> {
  if (!token || token.length < 32 || token.length > 128) return null;
  const id = hmacHex(`session:${token}`);
  const rows = await db
    .select({
      sessionId: adminSessions.id,
      expiresAt: adminSessions.expiresAt,
      lastSeenAt: adminSessions.lastSeenAt,
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
    })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminUsers.id, adminSessions.adminUserId))
    .where(and(eq(adminSessions.id, id), gt(adminSessions.expiresAt, new Date()), eq(adminUsers.isActive, true)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  if (Date.now() - row.lastSeenAt.getTime() > RENEW_AFTER_MS) {
    await db
      .update(adminSessions)
      .set({ lastSeenAt: new Date(), expiresAt: new Date(Date.now() + SESSION_TTL_MS) })
      .where(eq(adminSessions.id, id));
  }
  return { id: row.id, email: row.email, name: row.name, sessionId: row.sessionId };
}

/** Current admin for this request (memoised per request). */
export const getCurrentAdmin = cache(async (): Promise<AdminIdentity | null> => {
  const jar = await cookies();
  return resolveSessionToken(jar.get(SESSION_COOKIE)?.value);
});

/** For admin pages: redirect to the login screen when not authenticated. */
export async function requireAdminPage(): Promise<AdminIdentity> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/** For admin API routes: reads the session cookie from the request itself. */
export async function requireAdminApi(req: Request): Promise<AdminIdentity> {
  const admin = await resolveSessionToken(readCookie(req, SESSION_COOKIE));
  if (!admin) throw new ApiError(401, "unauthorized", "Please sign in as an administrator.");
  return admin;
}

/** Deletes the session referenced by the request's cookie (if any). */
export async function destroySessionFromRequest(req: Request) {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) {
    await db.delete(adminSessions).where(eq(adminSessions.id, hmacHex(`session:${token}`)));
  }
}
