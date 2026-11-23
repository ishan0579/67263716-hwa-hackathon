import { requireAdminApi, type AdminIdentity } from "./auth/session";
import { assertSameOrigin, route } from "./http";

/**
 * Wraps an admin API handler: same-origin check for mutations, then a
 * server-side session check. Unauthenticated requests get 401 before any
 * handler code runs.
 */
export function adminRoute<C = unknown>(
  handler: (req: Request, ctx: C, admin: AdminIdentity) => Promise<Response>,
) {
  return route<C>(async (req, ctx) => {
    if (req.method !== "GET" && req.method !== "HEAD") assertSameOrigin(req);
    const admin = await requireAdminApi(req);
    return handler(req, ctx, admin);
  });
}
