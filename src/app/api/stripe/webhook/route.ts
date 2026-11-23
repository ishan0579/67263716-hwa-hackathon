import { ApiError, ok, route } from "@/server/http";
import { isStripeEnabled } from "@/server/services/config";
import { getStripe, syncCheckoutSession } from "@/server/services/stripe";

/**
 * Stripe webhook (test mode). Verifies the signature against the raw body,
 * then re-reads the session from Stripe rather than trusting the payload.
 */
export const POST = route(async (req) => {
  if (!isStripeEnabled() || !process.env.STRIPE_WEBHOOK_SECRET) {
    throw new ApiError(404, "not_found", "Not found.");
  }
  const signature = req.headers.get("stripe-signature");
  if (!signature) throw new ApiError(400, "missing_signature", "Missing Stripe signature.");
  const body = await req.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    throw new ApiError(400, "invalid_signature", "Invalid Stripe signature.");
  }
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded" ||
    event.type === "checkout.session.expired"
  ) {
    await syncCheckoutSession(event.data.object.id);
  }
  return ok({ received: true });
});
