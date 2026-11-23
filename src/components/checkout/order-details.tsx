import type { CustomerOrderView } from "@/server/services/orders";
import { COLORWAYS } from "@/content/product";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { COUNTRIES } from "@/lib/validation/checkout";
import { ProductThumb } from "../cart/product-thumb";
import { Badge } from "../ui/misc";

const TONE: Record<string, "mint" | "warning" | "forest" | "muted" | "coral"> = {
  pending_payment: "warning",
  confirmed: "mint",
  processing: "mint",
  shipped: "forest",
  delivered: "forest",
  cancelled: "muted",
};

const PAYMENT_COPY: Record<string, string> = {
  not_charged: "Test order — no payment requested or taken",
  pending: "Awaiting Stripe test-mode payment",
  succeeded: "Paid in Stripe test mode (no real charge)",
  expired: "Payment window expired",
  failed: "Payment failed",
  refunded: "Refunded",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <Badge tone={TONE[status] ?? "neutral"}>{label}</Badge>;
}

/** Shared order breakdown for confirmation and tracking pages. */
export function OrderDetails({ order }: { order: CustomerOrderView }) {
  const country = COUNTRIES.find((c) => c.code === order.shipping.country)?.name ?? order.shipping.country;
  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <h2 className="text-eyebrow text-graphite/55">Items</h2>
        <ul className="mt-4 divide-y hairline border-y hairline">
          {order.items.map((i) => (
            <li key={i.sku} className="flex items-center gap-4 py-4">
              <div className="size-20 shrink-0 rounded-xl bg-sand/70 p-1.5">
                <ProductThumb
                  colorHex={i.colorHex}
                  accentHex={COLORWAYS.find((c) => c.colorHex.toLowerCase() === i.colorHex.toLowerCase())?.accentHex ?? "#FF794B"}
                  className="size-full"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{i.productName}</p>
                <p className="text-sm text-graphite/65">
                  {i.colorName} · {i.sizeLabel}
                </p>
                <p className="tabular mt-0.5 text-xs text-graphite/50">
                  SKU {i.sku} · {i.quantity} × {formatMoney(i.unitPriceCents, order.currency, { exact: true })}
                </p>
              </div>
              <p className="tabular font-medium">{formatMoney(i.lineTotalCents, order.currency, { exact: true })}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-6 space-y-2 text-[0.95rem]">
          <div className="flex justify-between">
            <dt className="text-graphite/65">Subtotal</dt>
            <dd className="tabular">{formatMoney(order.subtotalCents, order.currency, { exact: true })}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-graphite/65">Shipping</dt>
            <dd className="tabular">{order.shippingCents === 0 ? "Free" : formatMoney(order.shippingCents, order.currency, { exact: true })}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-graphite/65">Tax</dt>
            <dd>Not collected (demo)</dd>
          </div>
          <div className="flex justify-between border-t hairline pt-3 text-lg font-semibold">
            <dt>Total</dt>
            <dd className="tabular">{formatMoney(order.totalCents, order.currency, { exact: true })}</dd>
          </div>
        </dl>
      </div>
      <div className="space-y-8 lg:col-span-4 lg:col-start-9">
        <div>
          <h2 className="text-eyebrow text-graphite/55">Customer</h2>
          <p className="mt-3 leading-relaxed">
            {order.firstName} {order.lastName}
            <br />
            {order.email}
            {order.phone && (
              <>
                <br />
                {order.phone}
              </>
            )}
          </p>
        </div>
        <div>
          <h2 className="text-eyebrow text-graphite/55">Shipping to</h2>
          <p className="mt-3 leading-relaxed">
            {order.shipping.name}
            <br />
            {order.shipping.line1}
            {order.shipping.line2 ? `, ${order.shipping.line2}` : ""}
            <br />
            {order.shipping.city}, {order.shipping.region} {order.shipping.postalCode}
            <br />
            {country}
          </p>
          <p className="mt-2 text-sm text-graphite/60">{order.shippingMethodLabel}</p>
        </div>
        <div>
          <h2 className="text-eyebrow text-graphite/55">Payment</h2>
          <p className="mt-3 text-[0.95rem]">{PAYMENT_COPY[order.paymentStatus] ?? order.paymentStatus}</p>
        </div>
      </div>
    </div>
  );
}

export function Timeline({ order }: { order: CustomerOrderView }) {
  const steps = ["confirmed", "processing", "shipped", "delivered"] as const;
  const reached = new Set(order.timeline.map((t) => t.status));
  const at = (s: string) => order.timeline.find((t) => t.status === s)?.at;
  if (order.status === "cancelled" || order.status === "pending_payment") {
    return (
      <ol className="space-y-3">
        {order.timeline.map((t, i) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            <span className="size-2.5 rounded-full bg-forest" />
            <span className="font-medium">{t.label}</span>
            <span className="text-graphite/55">{formatDate(t.at, true)}</span>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <ol className="grid gap-4 sm:grid-cols-4">
      {steps.map((s, i) => {
        const done = reached.has(s);
        return (
          <li key={s} className="relative">
            <div className="flex items-center gap-2">
              <span className={`grid size-7 place-items-center rounded-full text-xs font-semibold ${done ? "bg-forest text-ivory" : "bg-graphite/10 text-graphite/50"}`}>{i + 1}</span>
              <span className={`hidden h-px flex-1 sm:block ${i < 3 ? (reached.has(steps[i + 1]!) ? "bg-forest" : "bg-graphite/15") : "bg-transparent"}`} />
            </div>
            <p className={`mt-3 font-medium capitalize ${done ? "" : "text-graphite/45"}`}>{s === "processing" ? "Preparing" : s}</p>
            <p className="text-xs text-graphite/55">{at(s) ? formatDate(at(s)!, true) : done ? "" : "Pending"}</p>
          </li>
        );
      })}
    </ol>
  );
}
