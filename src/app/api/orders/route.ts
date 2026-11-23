import { checkoutSchema, idempotencyKeySchema } from "@/lib/validation/checkout";
import { db } from "@/server/db";
import { normaliseTrackingKey } from "@/server/crypto";
import { ApiError, assertSameOrigin, clientIp, ok, readJson, route } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";
import { isStripeEnabled } from "@/server/services/config";
import { createOrder, transitionOrder } from "@/server/services/orders";
import { createCheckoutSession } from "@/server/services/stripe";
import { ORDER_COOKIE } from "@/server/constants";

/**
 * POST /api/orders — create an order.
 * Headers: `Idempotency-Key: <16–80 url-safe chars>` (required; reuse it when retrying).
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const key = idempotencyKeySchema.safeParse(req.headers.get("idempotency-key") ?? "");
  if (!key.success) {
    throw new ApiError(400, "invalid_idempotency_key", "A valid Idempotency-Key header is required.");
  }
  await enforceRateLimit("orders", clientIp(req), 12, 600);
  const input = await readJson(req, checkoutSchema);

  const provider = isStripeEnabled() ? "stripe" : "test_mode";
  const result = await createOrder(input, { idempotencyKey: key.data, provider });

  let redirectUrl = `/order/success?ref=${result.orderNumber}`;
  if (result.paymentProvider === "stripe" && result.status === "pending_payment") {
    try {
      redirectUrl = await createCheckoutSession(result.orderId);
    } catch (err) {
      console.error("[orders] Stripe session failed", err);
      await db.transaction((tx) =>
        transitionOrder(tx, result.orderId, "cancelled", {
          actor: "system",
          note: "Could not start Stripe checkout; stock released.",
        }),
      );
      throw new ApiError(502, "payment_unavailable", "We couldn't reach the test payment provider. Please try again.");
    }
  }

  const res = ok(
    {
      orderNumber: result.orderNumber,
      trackingKey: result.trackingKey,
      status: result.status,
      paymentProvider: result.paymentProvider,
      totalCents: result.totalCents,
      replayed: result.replayed,
      redirectUrl,
    },
    { status: result.replayed ? 200 : 201 },
  );
  if (result.trackingKey) {
    res.cookies.set(ORDER_COOKIE, `${result.orderNumber}.${normaliseTrackingKey(result.trackingKey)}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return res;
});
