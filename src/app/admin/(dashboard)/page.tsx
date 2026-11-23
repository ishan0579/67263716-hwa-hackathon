import Link from "next/link";
import { ReasonBadge, StockBadge } from "@/components/admin/badges";
import { formatDelta } from "@/components/admin/format";
import { ActivityIcon, BoxIcon, MailIcon, ReceiptIcon, StackIcon } from "@/components/admin/icons";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import {
  EmptyState,
  Panel,
  PageHeader,
  StatCard,
  TableScroll,
  tableClass,
  tdClass,
  theadClass,
  thClass,
  trClass,
} from "@/components/admin/ui";
import { ProductThumb } from "@/components/cart/product-thumb";
import { ButtonLink } from "@/components/ui/button";
import { ArrowRight, Check, Sparkle } from "@/components/ui/icons";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { ORDER_STATUSES } from "@/lib/validation/admin";
import { requireAdminPage } from "@/server/auth/session";
import type { InventoryReason } from "@/server/db/schema";
import { getDashboardStats } from "@/server/services/admin";
import { STATUS_LABELS } from "@/server/services/orders";

export const metadata = { title: "Overview" };

type Activity =
  | {
      kind: "status";
      id: string;
      at: Date;
      orderId: string;
      orderNumber: string;
      label: string;
      by: string;
    }
  | {
      kind: "stock";
      id: string;
      at: Date;
      sku: string;
      reason: InventoryReason;
      onHandDelta: number;
      reservedDelta: number;
    };

export default async function AdminOverviewPage() {
  const admin = await requireAdminPage();
  const stats = await getDashboardStats();

  const statusTotal = ORDER_STATUSES.reduce((s, k) => s + (stats.byStatus[k] ?? 0), 0);
  const statusMax = Math.max(1, ...ORDER_STATUSES.map((k) => stats.byStatus[k] ?? 0));

  const activity: Activity[] = [
    ...stats.recentEvents.map(
      (e): Activity => ({
        kind: "status",
        id: `e-${e.id}`,
        at: e.createdAt,
        orderId: e.orderId,
        orderNumber: e.orderNumber,
        label: STATUS_LABELS[e.toStatus],
        by: e.actor === "admin" ? (e.adminName ?? "an admin") : e.actor === "customer" ? "the customer" : "the system",
      }),
    ),
    ...stats.recentMovements.map(
      (m): Activity => ({
        kind: "stock",
        id: `m-${m.id}`,
        at: m.createdAt,
        sku: m.sku,
        reason: m.reason,
        onHandDelta: m.onHandDelta,
        reservedDelta: m.reservedDelta,
      }),
    ),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 10);

  const firstName = admin.name.split(/\s+/)[0] || admin.name;

  return (
    <>
      <PageHeader
        title="Overview"
        description={`Welcome back, ${firstName}. Here’s a snapshot of the demo store’s test orders, stock and messages.`}
        actions={
          <ButtonLink href="/admin/orders" variant="dark" size="sm" icon={<ReceiptIcon size={17} />}>
            View orders
          </ButtonLink>
        }
      />

      <section aria-label="Key figures" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          emphasis
          className="col-span-2 lg:col-span-1"
          label="Test-order revenue"
          value={formatMoney(stats.testRevenueCents)}
          hint="Simulated, no payments taken · excludes cancelled orders"
          icon={<Sparkle size={16} />}
        />
        <StatCard label="Total orders" value={stats.totalOrders.toLocaleString("en-US")} hint="All test orders, any status" href="/admin/orders" icon={<ReceiptIcon size={16} />} />
        <StatCard label="Orders · last 7 days" value={stats.ordersLast7Days.toLocaleString("en-US")} hint="Placed in the past week" icon={<ActivityIcon size={16} />} />
        <StatCard
          label="Active products / variants"
          value={
            <>
              {stats.products.active}
              <span className="text-graphite/35"> / </span>
              {stats.products.variants}
            </>
          }
          hint={`${stats.products.total} product${stats.products.total === 1 ? "" : "s"} in catalogue · ${stats.products.variants} variants`}
          href="/admin/products"
          icon={<BoxIcon size={16} />}
        />
        <StatCard
          label="New messages"
          value={stats.newMessages.toLocaleString("en-US")}
          hint={stats.newMessages ? "Awaiting a reply" : "Inbox zero"}
          href="/admin/messages?status=new"
          icon={<MailIcon size={16} />}
        />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]">
        <Panel
          id="recent-orders"
          title="Recent orders"
          actions={
            <Link href="/admin/orders" className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-forest underline-offset-4 hover:underline">
              All orders <ArrowRight size={15} />
            </Link>
          }
        >
          {stats.recentOrders.length === 0 ? (
            <EmptyState icon={<ReceiptIcon size={20} />} title="No orders yet" description="Test orders placed on the storefront will appear here." />
          ) : (
            <TableScroll label="Recent orders">
              <table className={`${tableClass} min-w-[34rem]`}>
                <thead className={theadClass}>
                  <tr>
                    <th scope="col" className={thClass}>Reference</th>
                    <th scope="col" className={thClass}>Customer</th>
                    <th scope="col" className={thClass}>Placed</th>
                    <th scope="col" className={`${thClass} text-right`}>Total</th>
                    <th scope="col" className={thClass}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.map((o) => (
                    <tr key={o.id} className={`${trClass} hover:bg-sand/25`}>
                      <th scope="row" className={`${tdClass} font-normal`}>
                        <Link href={`/admin/orders/${o.id}`} className="whitespace-nowrap font-mono text-[0.82rem] font-medium text-forest underline decoration-forest/25 underline-offset-4 hover:decoration-forest">
                          {o.orderNumber}
                        </Link>
                      </th>
                      <td className={tdClass}>
                        {o.firstName} {o.lastName}
                      </td>
                      <td className={`${tdClass} whitespace-nowrap text-graphite/70`}>{formatDate(o.createdAt, true)}</td>
                      <td className={`${tdClass} tabular text-right font-medium`}>{formatMoney(o.totalCents, "USD", { exact: true })}</td>
                      <td className={tdClass}>
                        <OrderStatusBadge status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          )}
        </Panel>

        <Panel id="by-status" title="Orders by status" description={`${statusTotal} order${statusTotal === 1 ? "" : "s"} in total`}>
          <ul className="flex flex-col gap-1 p-3 sm:p-4">
            {ORDER_STATUSES.map((s) => {
              const n = stats.byStatus[s] ?? 0;
              const pct = statusTotal ? Math.round((n / statusTotal) * 100) : 0;
              return (
                <li key={s}>
                  <Link
                    href={`/admin/orders?status=${s}`}
                    className="group grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2 hover:bg-sand/40"
                  >
                    <span className="truncate text-sm text-graphite">{STATUS_LABELS[s]}</span>
                    <span aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-graphite/[0.07]">
                      <span
                        className={`block h-full rounded-full ${s === "cancelled" ? "bg-coral" : s === "pending_payment" ? "bg-[#e0a84a]" : "bg-forest"}`}
                        style={{ width: `${(n / statusMax) * 100}%` }}
                      />
                    </span>
                    <span className="tabular w-16 text-right text-sm font-medium text-forest">
                      {n}
                      <span className="sr-only"> orders</span>
                      <span className="ml-1 text-xs font-normal text-graphite/50">{pct}%</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-2">
        <Panel
          id="low-stock"
          title="Low-stock alerts"
          description="Variants at or below their low-stock threshold"
          actions={
            <Link href="/admin/inventory" className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-forest underline-offset-4 hover:underline">
              Inventory <ArrowRight size={15} />
            </Link>
          }
        >
          {stats.lowStock.length === 0 ? (
            <EmptyState icon={<Check size={20} />} title="Stock looks healthy" description="Every variant is above its low-stock threshold." />
          ) : (
            <ul className="divide-y divide-graphite/[0.07]">
              {stats.lowStock.map((v) => (
                <li key={v.variantId}>
                  <Link href={`/admin/inventory#variant-${v.variantId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-sand/25 sm:px-5">
                    <ProductThumb colorHex={v.colorHex} accentHex={v.accentHex} className="h-9 w-11 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-graphite">{v.name}</span>
                      <span className="block truncate font-mono text-xs text-graphite/55">{v.sku}</span>
                    </span>
                    <span className="tabular hidden text-right text-xs text-graphite/65 xs:block">
                      <span className="block text-sm font-medium text-forest">{v.available} available</span>
                      threshold {v.lowStockThreshold}
                    </span>
                    <StockBadge status={v.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel id="activity" title="Recent activity" description="Order status changes and stock movements">
          {activity.length === 0 ? (
            <EmptyState icon={<ActivityIcon size={20} />} title="Nothing yet" description="Status changes and stock movements will show up here." />
          ) : (
            <ol className="flex flex-col px-4 py-2 sm:px-5">
              {activity.map((a) => (
                <li key={a.id} className="flex gap-3 border-b border-graphite/[0.07] py-3 last:border-b-0">
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${a.kind === "status" ? "bg-mint/70 text-forest" : "bg-sand text-forest"}`}
                  >
                    {a.kind === "status" ? <ReceiptIcon size={14} /> : <StackIcon size={14} />}
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    {a.kind === "status" ? (
                      <p className="leading-snug text-graphite">
                        <Link href={`/admin/orders/${a.orderId}`} className="font-mono text-[0.8rem] font-medium text-forest underline decoration-forest/25 underline-offset-4 hover:decoration-forest">
                          {a.orderNumber}
                        </Link>{" "}
                        → <strong className="font-medium">{a.label}</strong> <span className="text-graphite/60">by {a.by}</span>
                      </p>
                    ) : (
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 leading-snug text-graphite">
                        <span className="font-mono text-[0.8rem] font-medium">{a.sku}</span>
                        {a.onHandDelta !== 0 && <span className="tabular">{formatDelta(a.onHandDelta)} on hand</span>}
                        {a.reservedDelta !== 0 && <span className="tabular">{formatDelta(a.reservedDelta)} reserved</span>}
                        <ReasonBadge reason={a.reason} />
                      </p>
                    )}
                    <p className="mt-1 text-xs text-graphite/55">
                      <time dateTime={a.at.toISOString()}>{formatDate(a.at, true)}</time>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </>
  );
}
