import { destroySessionFromRequest, SESSION_COOKIE } from "@/server/auth/session";
import { assertSameOrigin, ok, route } from "@/server/http";

export const POST = route(async (req) => {
  assertSameOrigin(req);
  await destroySessionFromRequest(req);
  const res = ok({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
});
