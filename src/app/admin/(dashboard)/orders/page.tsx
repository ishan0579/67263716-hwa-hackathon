import Link from "next/link";
import { firstParam, PROVIDER_LABELS } from "@/components/admin/format";
import { ReceiptIcon } from "@/components/admin/icons";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { OrdersFilter } from "@/components/admin/orders-filter";
import { Pagination } from "@/components/admin/pagination";
import { EmptyState, Panel, PageHeader, TableScroll, tableClass, tdClass, theadClass, thClass, trClass } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { ORDER_STATUSES } from "@/lib/validation/admin";
import { requireAdminPage } from "@/server/auth/session";
import type { OrderStatus } from "@/server/db/schema";
import { listOrders } from "@/server/services/admin";
import { STATUS_LABELS } from "@/server/services/orders";

export const metadata = { title: "Orders" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function isOrderStatus(v: string | undefined): v is OrderStatus {
  return !!v && (ORDER_STATUSES as readonly string[]).includes(v);
}

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage();
  const sp = await searchParams;
  const q = (firstParam(sp.q) ?? "").trim().slice(0, 100);
  const statusParam = firstParam(sp.status);
  const status: OrderStatus | "all" = isOrderStatus(statusParam) ? statusParam : "all";
  const requestedPage = Math.min(10_000, Math.max(1, Number.parseInt(firstParam(sp.page) ?? "1", 10) || 1));

  const { rows, total, page, pageSize } = await listOrders({ q, status, page: requestedPage, pageSize: 20 });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const filtered = q !== "" || status !== "all";
  const filterParams = { q: q || undefined, status: status === "all" ? undefined : status };

  return (
    <>
      <PageHeader title="Orders" description="Every test order placed on the storefront. Search by customer name, email or order reference." />

      <Panel>
        <OrdersFilter
          key={`${q}|${status}`}
          q={q}
          status={status}
          statusOptions={ORDER_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
        />

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-graphite/[0.07] px-4 py-2.5 text-sm text-graphite/65 sm:px-5" aria-live="polite">
          <p className="tabular">
            {total === 0 ? (
              "No orders"
            ) : (
              <>
                Showing <span className="font-medium text-graphite">{from}</span>–<span className="font-medium text-graphite">{to}</span> of{" "}
                <span className="font-medium text-graphite">{total}</span> order{total === 1 ? "" : "s"}
              </>
            )}
            {filtered && (
              <>
                {" "}
                matching
                {q && (
                  <>
                    {" "}
                    “<span className="text-graphite">{q}</span>”
                  </>
                )}
                {status !== "all" && <> with status {STATUS_LABELS[status]}</>}
              </>
            )}
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="border-t border-graphite/[0.07]">
            {filtered || page > 1 ? (
              <EmptyState
                icon={<ReceiptIcon size={20} />}
                title={page > totalPages && total > 0 ? "That page is empty" : "No matching orders"}
                description={
                  page > totalPages && total > 0
                    ? "There are fewer results than that page number."
                    : "Try a different name, email or reference, or clear the filters."
                }
                action={
                  <ButtonLink href="/admin/orders" variant="outline" size="sm" className="text-forest">
                    Clear filters
                  </ButtonLink>
                }
              />
            ) : (
              <EmptyState
                icon={<ReceiptIcon size={20} />}
                title="No orders yet"
                description="When someone places a test order on the storefront it will appear here."
                action={
                  <ButtonLink href="/product/snifforbit-one" variant="outline" size="sm" className="text-forest">
                    Open the product page
                  </ButtonLink>
                }
              />
            )}
          </div>
        ) : (
          <TableScroll label="Orders">
            <table className={`${tableClass} min-w-[54rem]`}>
              <thead className={theadClass}>
                <tr>
                  <th scope="col" className={thClass}>Reference</th>
                  <th scope="col" className={thClass}>Customer</th>
                  <th scope="col" className={thClass}>Placed</th>
                  <th scope="col" className={`${thClass} text-right`}>Items</th>
                  <th scope="col" className={`${thClass} text-right`}>Total</th>
                  <th scope="col" className={thClass}>Payment</th>
                  <th scope="col" className={thClass}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} className={`${trClass} hover:bg-sand/25`}>
                    <th scope="row" className={`${tdClass} font-normal`}>
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="whitespace-nowrap font-mono text-[0.82rem] font-medium text-forest underline decoration-forest/25 underline-offset-4 hover:decoration-forest"
                      >
                        {o.orderNumber}
                      </Link>
                    </th>
                    <td className={tdClass}>
                      <span className="block font-medium text-graphite">
                        {o.firstName} {o.lastName}
                      </span>
                      <span className="block max-w-[16rem] truncate text-xs text-graphite/60">{o.email}</span>
                    </td>
                    <td className={`${tdClass} whitespace-nowrap text-graphite/70`}>{formatDate(o.createdAt, true)}</td>
                    <td className={`${tdClass} tabular text-right`}>{o.itemCount}</td>
                    <td className={`${tdClass} tabular whitespace-nowrap text-right font-medium`}>{formatMoney(o.totalCents, "USD", { exact: true })}</td>
                    <td className={`${tdClass} whitespace-nowrap text-graphite/70`}>{PROVIDER_LABELS[o.paymentProvider]}</td>
                    <td className={tdClass}>
                      <OrderStatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}

        <Pagination basePath="/admin/orders" page={page} totalPages={totalPages} params={filterParams} />
      </Panel>
    </>
  );
}
