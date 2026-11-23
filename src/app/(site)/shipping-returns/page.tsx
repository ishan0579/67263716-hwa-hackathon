import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "Shipping & returns",
  description: "Demonstration shipping rates and how returns work for test orders in the SniffOrbit store.",
  alternates: { canonical: "/shipping-returns" },
};

export default function ShippingReturnsPage() {
  return (
    <LegalPage
      eyebrow="Shipping & returns"
      title="Shipping & returns"
      updated="November 2026"
      intro="The rates below are used to calculate totals in this demonstration store. Because orders are test orders, nothing actually ships."
    >
      <h2>Demonstration shipping rates</h2>
      <ul>
        <li>
          <strong>Standard</strong> — $9.00, free on orders from $140. Shown as 5–8 business days (illustrative estimate).
        </li>
        <li>
          <strong>Express</strong> — $24.00. Shown as 2–3 business days (illustrative estimate).
        </li>
        <li>Demo checkout accepts addresses in the United States and Canada.</li>
        <li>Sales tax is not calculated or collected.</li>
      </ul>
      <p>Shipping is always recalculated on the server from current rates when you place an order.</p>
      <h2>Order status</h2>
      <p>
        After checkout your order is <em>Confirmed</em>. The store administrator may move it through <em>Preparing</em>, <em>Shipped</em> and{" "}
        <em>Delivered</em> to demonstrate fulfilment — you can follow those updates on the <Link href="/order/track">tracking page</Link>. No parcel is
        sent.
      </p>
      <h2>Returns & refunds</h2>
      <p>
        No payment is taken and no product is delivered, so there is nothing to return or refund. If you&apos;d like a test order cancelled,{" "}
        <Link href="/contact">contact us</Link> with your order reference; cancelling returns the demo stock to inventory.
      </p>
      <h2>If SniffOrbit were ever produced</h2>
      <p>A real store would publish full shipping, returns and warranty terms before taking any payment.</p>
    </LegalPage>
  );
}
