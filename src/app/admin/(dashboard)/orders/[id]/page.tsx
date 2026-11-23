import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PaymentStatusBadge } from "@/components/admin/badges";
import { ACTOR_LABELS, isUuid, PROVIDER_LABELS } from "@/components/admin/format";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { OrderStatusForm } from "@/components/admin/order-status-form";
import { DescriptionList, Panel, PageHeader, Swatch, TableScroll, tableClass, tdClass, theadClass, thClass, trClass } from "@/components/admin/ui";
import { ProductThumb } from "@/components/cart/product-thumb";
import { Badge, Breadcrumbs } from "@/components/ui/misc";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { getCurrentAdmin, requireAdminPage } from "@/server/auth/session";
import { getOrderAdmin, getProductAdmin } from "@/server/services/admin";
import { STATUS_LABELS } from "@/server/services/orders";

type Params = Promise<{ id: string }>;

const loadOrder = cache(async (id: string) => (isUuid(id) ? getOrderAdmin(id) : null));

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  if (!(await getCurrentAdmin())) return { title: "Order" };
  const data = await loadOrder((await params).id);
  return { title: data ? `Order ${data.order.orderNumber}` : "Order not found" };
}

const COUNTRY_NAMES: Record<string, string> = { US: "United States", CA: "Canada" };

export default async function AdminOrderDetailPage({ params }: { params: Params }) {
  await requireAdminPage();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const data = await loadOrder(id);
  if (!data) notFound();
  const { order, items, events, payments, allowedTransitions } = data;

  // Accent colours for the thumbnails come from the live variant records.
  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await Promise.all(productIds.map((pid) => getProductAdmin(pid)));
  const accentByVariant = new Map<string, string>();
  for (const p of products) for (const v of p?.variants ?? []) accentByVariant.set(v.id, v.accentHex);

  const unitCount = items.reduce((s, i) => s + i.quantity, 0);
  const money = (c: number) => formatMoney(c, order.currency, { exact: true });

  return (
    <>
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[
              { href: "/admin/orders", label: "Orders" },
              { label: order.orderNumber },
            ]}
          />
        }
        title={<span className="font-mono text-[0.85em] tracking-[-0.02em]">{order.orderNumber}</span>}
        meta={
          <>
            <OrderStatusBadge status={order.status} />
            {order.isDemo && <Badge tone="muted">Test order</Badge>}
            <span>
              Placed <time dateTime={order.createdAt.toISOString()}>{formatDate(order.createdAt, true)}</time>
            </span>
            <span aria-hidden="true" className="text-graphite/30">
              ·
            </span>
            <span>{money(order.totalCents)}</span>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel id="items" title="Items" description={`${unitCount} unit${unitCount === 1 ? "" : "s"} across ${items.length} line${items.length === 1 ? "" : "s"}`}>
            <TableScroll label="Order items" className="rounded-b-none">
              <table className={`${tableClass} min-w-[40rem]`}>
                <thead className={theadClass}>
                  <tr>
                    <th scope="col" className={thClass}>Item</th>
                    <th scope="col" className={thClass}>SKU</th>
                    <th scope="col" className={`${thClass} text-right`}>Qty</th>
                    <th scope="col" className={`${thClass} text-right`}>Unit</th>
                    <th scope="col" className={`${thClass} text-right`}>Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id} className={trClass}>
                      <th scope="row" className={`${tdClass} font-normal`}>
                        <div className="flex items-center gap-3">
                          <span className="grid h-12 w-14 shrink-0 place-items-center rounded-lg bg-sand/50">
                            <ProductThumb colorHex={i.colorHex} accentHex={accentByVariant.get(i.variantId) ?? i.colorHex} className="h-10 w-12" />
                          </span>
                          <span className="min-w-0">
                            <span className="block font-medium text-graphite">{i.productName}</span>
                            <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-graphite/65">
                              <Swatch hex={i.colorHex} className="size-3" />
                              {i.colorName} · {i.sizeLabel}
                            </span>
                          </span>
                        </div>
                      </th>
                      <td className={`${tdClass} whitespace-nowrap font-mono text-xs text-graphite/70`}>{i.sku}</td>
                      <td className={`${tdClass} tabular text-right`}>{i.quantity}</td>
                      <td className={`${tdClass} tabular whitespace-nowrap text-right text-graphite/75`}>{money(i.unitPriceCents)}</td>
                      <td className={`${tdClass} tabular whitespace-nowrap text-right font-medium`}>{money(i.lineTotalCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
            <dl className="tabular ml-auto flex w-full max-w-sm flex-col gap-2 border-t border-graphite/[0.07] px-4 py-4 text-sm sm:px-5">
              <div className="flex justify-between gap-4">
                <dt className="text-graphite/65">Subtotal</dt>
                <dd>{money(order.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-graphite/65">Shipping</dt>
                <dd>{order.shippingCents === 0 ? "Free" : money(order.shippingCents)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-graphite/65">Tax</dt>
                <dd>{money(order.taxCents)}</dd>
              </div>
              <div className="mt-1 flex justify-between gap-4 border-t border-graphite/10 pt-3 text-base font-semibold text-forest">
                <dt>Total</dt>
                <dd>{money(order.totalCents)}</dd>
              </div>
            </dl>
          </Panel>

          <Panel id="history" title="Status history" description="Oldest first">
            <ol className="relative flex flex-col gap-0 px-4 py-4 sm:px-5">
              {events.map((e, idx) => {
                const last = idx === events.length - 1;
                return (
                  <li key={e.id} className="relative flex gap-3.5 pb-5 last:pb-0">
                    {!last && <span aria-hidden="true" className="absolute left-[0.6875rem] top-6 bottom-0 w-px bg-graphite/15" />}
                    <span
                      aria-hidden="true"
                      className={`relative mt-1 grid size-[1.375rem] shrink-0 place-items-center rounded-full border-2 ${last ? "border-forest bg-mint" : "border-graphite/25 bg-white"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <OrderStatusBadge status={e.toStatus} />
                        {e.fromStatus && <span className="text-xs text-graphite/55">from {STATUS_LABELS[e.fromStatus]}</span>}
                      </div>
                      <p className="mt-1.5 text-sm text-graphite">
                        {e.actor === "admin" ? (
                          <>
                            {ACTOR_LABELS.admin}
                            {e.adminName && <> · {e.adminName}</>}
                          </>
                        ) : (
                          ACTOR_LABELS[e.actor]
                        )}
                        <span className="text-graphite/40"> · </span>
                        <time dateTime={e.createdAt.toISOString()} className="text-graphite/60">
                          {formatDate(e.createdAt, true)}
                        </time>
                      </p>
                      {e.note && <p className="mt-1.5 rounded-lg bg-sand/45 px-3 py-2 text-sm leading-relaxed text-graphite/80">{e.note}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Panel>

          {order.customerNote && (
            <Panel id="customer-note" title="Customer note">
              <p className="whitespace-pre-wrap break-words px-4 py-4 text-sm leading-relaxed text-graphite sm:px-5">{order.customerNote}</p>
            </Panel>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Panel id="update-status" title="Update status">
            <OrderStatusForm
              orderId={order.id}
              orderNumber={order.orderNumber}
              currentStatus={order.status}
              currentLabel={STATUS_LABELS[order.status]}
              options={allowedTransitions.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
              unitCount={unitCount}
            />
          </Panel>

          <Panel id="customer" title="Customer">
            <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
              <DescriptionList
                items={[
                  { label: "Name", value: `${order.firstName} ${order.lastName}` },
                  {
                    label: "Email",
                    value: (
                      <a href={`mailto:${order.email}`} className="text-forest underline decoration-forest/25 underline-offset-4 hover:decoration-forest">
                        {order.email}
                      </a>
                    ),
                  },
                  {
                    label: "Phone",
                    value: order.phone ? (
                      <a href={`tel:${order.phone.replace(/[^\d+]/g, "")}`} className="text-forest underline decoration-forest/25 underline-offset-4 hover:decoration-forest">
                        {order.phone}
                      </a>
                    ) : (
                      <span className="text-graphite/50">Not provided</span>
                    ),
                  },
                ]}
              />
              <Link
                href={`/admin/orders?q=${encodeURIComponent(order.email)}`}
                className="self-start text-sm font-medium text-forest underline decoration-forest/25 underline-offset-4 hover:decoration-forest"
              >
                Other orders from this customer
              </Link>
            </div>
          </Panel>

          <Panel id="shipping" title="Shipping">
            <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
              <address className="text-sm not-italic leading-relaxed text-graphite">
                {order.shipName}
                <br />
                {order.shipLine1}
                {order.shipLine2 && (
                  <>
                    <br />
                    {order.shipLine2}
                  </>
                )}
                <br />
                {order.shipCity}, {order.shipRegion} {order.shipPostalCode}
                <br />
                {COUNTRY_NAMES[order.shipCountry] ?? order.shipCountry}
              </address>
              <DescriptionList
                items={[
                  { label: "Method", value: order.shippingMethodLabel },
                  { label: "Cost", value: order.shippingCents === 0 ? "Free" : money(order.shippingCents) },
                ]}
              />
            </div>
          </Panel>

          <Panel id="payment" title="Payment">
            <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
              {payments.length === 0 ? (
                <p className="text-sm text-graphite/65">No payment records for this order.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {payments.map((p) => (
                    <li key={p.id} className="rounded-xl border border-graphite/10 bg-ivory/60 p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium text-graphite">{PROVIDER_LABELS[p.provider]}</span>
                        <PaymentStatusBadge status={p.status} />
                      </div>
                      <DescriptionList
                        className="mt-3 text-[0.82rem]"
                        items={[
                          { label: "Amount", value: <span className="tabular">{formatMoney(p.amountCents, p.currency, { exact: true })}</span> },
                          ...(p.providerReference
                            ? [{ label: "Reference", value: <span className="break-all font-mono text-xs">{p.providerReference}</span> }]
                            : []),
                          { label: "Created", value: formatDate(p.createdAt, true) },
                          { label: "Updated", value: formatDate(p.updatedAt, true) },
                        ]}
                      />
                    </li>
                  ))}
                </ul>
              )}
              {order.paymentProvider === "test_mode" && (
                <p className="text-xs leading-relaxed text-graphite/60">Test-mode order: no payment was requested or taken.</p>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
