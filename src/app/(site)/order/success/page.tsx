import type { Metadata } from "next";
import { cookies } from "next/headers";
import { OrderCelebration, TrackingKeyCard } from "@/components/checkout/order-success-client";
import { OrderDetails, StatusBadge } from "@/components/checkout/order-details";
import { ButtonLink } from "@/components/ui/button";
import { ConceptNotice } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";
import { ORDER_COOKIE } from "@/server/constants";
import { formatTrackingKey } from "@/server/crypto";
import { isStripeEnabled } from "@/server/services/config";
import { getOrderForCustomer } from "@/server/services/orders";
import { syncCheckoutSession } from "@/server/services/stripe";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order confirmed", robots: { index: false, follow: false } };

/**
 * Confirmation is rendered only for a persisted order the visitor can prove
 * access to: the httpOnly cookie set at checkout holds the order's secret
 * tracking key. A bare `?ref=` grants nothing.
 */
export default async function OrderSuccessPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const ref = sp.ref?.toUpperCase() ?? "";
  const raw = (await cookies()).get(ORDER_COOKIE)?.value ?? "";
  const [cookieRef, cookieKey] = raw.split(".");

  let order = null;
  if (ref && cookieRef === ref && cookieKey) {
    if (sp.session_id && isStripeEnabled()) {
      await syncCheckoutSession(sp.session_id).catch((e) => console.error("[order/success] stripe sync failed", e));
    }
    order = await getOrderForCustomer(ref, cookieKey);
  }

  if (!order) {
    return (
      <section data-nav="light" className="grid min-h-[80svh] place-items-center bg-ivory px-4 pt-24 text-forest">
        <div className="max-w-lg text-center">
          <h1 className="text-display-3">We can&apos;t show that order here.</h1>
          <p className="mt-5 text-graphite/70">
            For privacy, confirmations are only shown in the browser that placed the order. Use your order reference and tracking key on the tracking
            page instead.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href={`/order/track${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`} arrow>
              Track an order
            </ButtonLink>
            <ButtonLink href="/" variant="outline">
              Back home
            </ButtonLink>
          </div>
        </div>
      </section>
    );
  }

  const pending = order.status === "pending_payment";

  return (
    <>
      <section data-nav="dark" data-surface="dark" className="grain relative overflow-hidden bg-forest pb-20 pt-32 text-ivory sm:pt-40">
        <div className="container-x grid items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="text-eyebrow text-mint">{pending ? "Almost there" : "Test order placed"}</p>
            <h1 className="text-display-2 mt-5">
              {pending ? "Waiting for payment." : (
                <>
                  Discovery <span className="font-serif-italic font-normal text-mint">secured.</span>
                </>
              )}
            </h1>
            <p className="text-lede mt-6 max-w-[48ch] text-ivory/75">
              {pending
                ? "Stripe hasn't confirmed this test payment yet. Refresh in a moment — we'll update the status as soon as it arrives."
                : `Thank you, ${order.firstName}. Your order is saved and confirmed in our database. As a demonstration store, no payment was taken and nothing will ship.`}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4 text-sm">
              <span className="rounded-full border border-ivory/20 px-4 py-2">
                Reference <strong className="tabular ml-1 font-semibold">{order.orderNumber}</strong>
              </span>
              <StatusBadge status={order.status} label={order.statusLabel} />
              <span className="text-ivory/60">{formatDate(order.createdAt, true)}</span>
            </div>
          </div>
          <div className="lg:col-span-4 lg:col-start-9">
            <OrderCelebration />
          </div>
        </div>
      </section>
      <section data-nav="light" className="bg-ivory py-16 text-forest sm:py-20">
        <div className="container-x space-y-14">
          <TrackingKeyCard orderNumber={order.orderNumber} trackingKey={formatTrackingKey(cookieKey!)} />
          <OrderDetails order={order} />
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/experience" variant="dark" arrow>
              Play the demo while you wait
            </ButtonLink>
            <ButtonLink href="/" variant="outline">
              Back to home
            </ButtonLink>
          </div>
          <ConceptNotice className="max-w-3xl" />
        </div>
      </section>
    </>
  );
}
