import { orderLookupSchema } from "@/lib/validation/checkout";
import { ApiError, assertSameOrigin, clientIp, ok, readJson, route } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";
import { getOrderForCustomer } from "@/server/services/orders";

/**
 * POST /api/orders/lookup — guest order status. Requires the order reference
 * AND the secret tracking key. Rate limited; failures are indistinguishable.
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  await enforceRateLimit("order-lookup", clientIp(req), 20, 600);
  const { orderNumber, trackingKey } = await readJson(req, orderLookupSchema);
  const order = await getOrderForCustomer(orderNumber, trackingKey);
  if (!order) {
    throw new ApiError(404, "order_not_found", "We couldn't find an order matching that reference and tracking key.");
  }
  return ok({ order });
});
