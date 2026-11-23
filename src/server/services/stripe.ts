/**
 * Optional Stripe Checkout integration — TEST MODE ONLY.
 * Card details are entered on Stripe's hosted page; this app never sees them.
 * Live keys are deliberately refused because this is a demonstration store.
 */
import Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { orderItems, orders, payments } from "../db/schema";
import { ApiError } from "../http";
import { isStripeEnabled } from "./config";
import { transitionOrder } from "./orders";
import { SITE } from "@/lib/site";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!isStripeEnabled()) throw new ApiError(503, "stripe_disabled", "Stripe test mode is not configured.");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY!, { appInfo: { name: "SniffOrbit demo store" } });
  return client;
}

export async function createCheckoutSession(orderId: string) {
  const stripe = getStripe();
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) throw new ApiError(404, "not_found", "Order not found.");
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((i) => ({
    quantity: i.quantity,
    price_data: {
      currency: order.currency.toLowerCase(),
      unit_amount: i.unitPriceCents,
      product_data: { name: `${i.productName} — ${i.colorName}`, description: `${i.sizeLabel} · concept demo order` },
    },
  }));
  if (order.shippingCents > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: order.currency.toLowerCase(),
        unit_amount: order.shippingCents,
        product_data: { name: `Shipping — ${order.shippingMethodLabel}` },
      },
    });
  }

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      line_items: lineItems,
      customer_email: order.email,
      client_reference_id: order.id,
      metadata: { orderId: order.id, orderNumber: order.orderNumber },
      success_url: `${SITE.url}/order/success?ref=${order.orderNumber}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE.url}/checkout?cancelled=${order.orderNumber}`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    },
    { idempotencyKey: `checkout-${order.id}` },
  );

  await db
    .update(payments)
    .set({ providerReference: session.id })
    .where(and(eq(payments.orderId, order.id), eq(payments.provider, "stripe")));
  if (!session.url) throw new ApiError(502, "stripe_error", "Stripe did not return a checkout URL.");
  return session.url;
}

/** Idempotently records a completed or expired Checkout Session. */
export async function syncCheckoutSession(sessionId: string) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const orderId = session.metadata?.orderId ?? session.client_reference_id;
  if (!orderId) return null;

  await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!order || order.status !== "pending_payment") return;
    if (session.payment_status === "paid" && session.amount_total === order.totalCents) {
      await transitionOrder(tx, orderId, "confirmed", { actor: "system", note: "Stripe test-mode payment succeeded." });
      await tx
        .update(payments)
        .set({ status: "succeeded", providerReference: session.id })
        .where(eq(payments.orderId, orderId));
    } else if (session.status === "expired") {
      await transitionOrder(tx, orderId, "cancelled", { actor: "system", note: "Stripe session expired; stock released." });
      await tx.update(payments).set({ status: "expired" }).where(eq(payments.orderId, orderId));
    }
  });
  return orderId;
}
