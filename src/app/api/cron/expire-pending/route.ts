import { timingSafeEqual } from "node:crypto";
import { ApiError, ok, route } from "@/server/http";
import { expireStalePendingOrders } from "@/server/services/orders";

/**
 * GET /api/cron/expire-pending — releases stock held by abandoned Stripe
 * test-mode checkouts (backstop for the `checkout.session.expired` webhook).
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically.
 */
export const GET = route(async (req) => {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret ?? ""}`;
  const valid = Boolean(secret) && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!valid) throw new ApiError(401, "unauthorized", "Unauthorized.");
  const released = await expireStalePendingOrders();
  return ok({ released });
});
