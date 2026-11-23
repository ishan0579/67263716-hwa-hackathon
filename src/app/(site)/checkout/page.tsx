import type { Metadata } from "next";
import { CheckoutFlow } from "@/components/checkout/checkout-flow";
import { isStripeEnabled } from "@/server/services/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Secure test-mode checkout for the SniffOrbit demonstration store.",
  robots: { index: false },
};

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const shipping = sp.shipping === "express" ? "express" : "standard";
  return <CheckoutFlow stripeEnabled={isStripeEnabled()} initialShipping={shipping} cancelledRef={sp.cancelled ?? null} />;
}
