import type { Metadata } from "next";
import { OrderTracker } from "@/components/checkout/order-tracker";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Track an order",
  description: "Look up a SniffOrbit test order with its reference and private tracking key.",
  alternates: { canonical: "/order/track" },
};

export default async function TrackPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return (
    <>
      <PageHeader
        size="md"
        eyebrow="Order tracking"
        title="Where's my orbit?"
        lede="Enter your order reference and the private tracking key shown on your confirmation. Both are required — references alone never reveal order details."
        crumbs={[{ label: "Track an order" }]}
      />
      <section data-nav="light" className="bg-ivory pb-24 text-forest">
        <div className="container-x">
          <OrderTracker initialRef={sp.ref ?? ""} />
        </div>
      </section>
    </>
  );
}
