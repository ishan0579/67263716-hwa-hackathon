import { eq } from "drizzle-orm";
import { adminLoginSchema } from "@/lib/validation/forms";
import { db } from "@/server/db";
import { adminUsers } from "@/server/db/schema";
import { getDummyHash, verifyPassword } from "@/server/auth/password";
import { createAdminSession, SESSION_COOKIE, sessionCookieOptions } from "@/server/auth/session";
import { ApiError, assertSameOrigin, clientIp, ok, readJson, route } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ip = clientIp(req);
  await enforceRateLimit("admin-login-ip", ip, 10, 900);
  const { email, password } = await readJson(req, adminLoginSchema);
  await enforceRateLimit("admin-login-email", email, 6, 900);

  const admin = await db.query.adminUsers.findFirst({ where: eq(adminUsers.email, email) });
  // Always run a full hash comparison so response time doesn't reveal which emails exist.
  const valid = await verifyPassword(password, admin?.passwordHash ?? (await getDummyHash()));
  if (!admin || !admin.isActive || !valid) {
    throw new ApiError(401, "invalid_credentials", "That email and password combination isn't right.");
  }

  const { token, expiresAt } = await createAdminSession(admin.id, req.headers.get("user-agent"));
  await db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, admin.id));
  const res = ok({ ok: true, name: admin.name });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  return res;
});
