import Link from "next/link";
import { ReasonBadge } from "@/components/admin/badges";
import { firstParam, formatDelta, isUuid } from "@/components/admin/format";
import { StackIcon } from "@/components/admin/icons";
import { InventoryTable } from "@/components/admin/inventory-table";
import { MovementFilter } from "@/components/admin/movement-filter";
import { EmptyState, Panel, PageHeader, StatCard, TableScroll, tableClass, tdClass, theadClass, thClass, trClass } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";
import { requireAdminPage } from "@/server/auth/session";
import type { InventoryReason } from "@/server/db/schema";
import { listInventory, listMovements } from "@/server/services/admin";

export const metadata = { title: "Inventory" };

function formatTime(d: Date) {
  return new Intl.DateTimeFormat("en-US", { timeStyle: "short" }).format(d);
}

/** Who caused a movement: the admin, the customer's checkout, or the system (payments / expiry). */
function movementActor(m: { adminName: string | null; orderId: string | null; reason: InventoryReason }) {
  if (m.adminName) return m.adminName;
  if (m.orderId && (m.reason === "sale" || m.reason === "reservation")) return "Checkout";
  return "System";
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminInventoryPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage();
  const sp = await searchParams;
  const variantParam = firstParam(sp.variant);
  const variantId = isUuid(variantParam) ? variantParam : undefined;

  const [stock, movements] = await Promise.all([listInventory(), listMovements({ variantId, limit: 50 })]);
  const selected = variantId ? stock.find((s) => s.variantId === variantId) : undefined;

  const totals = stock.reduce(
    (t, s) => ({
      available: t.available + Math.max(0, s.available),
      onHand: t.onHand + s.onHand,
      reserved: t.reserved + s.reserved,
      low: t.low + (s.status === "low_stock" ? 1 : 0),
      out: t.out + (s.status === "sold_out" ? 1 : 0),
    }),
    { available: 0, onHand: 0, reserved: 0, low: 0, out: 0 },
  );

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Stock per variant. Available = on hand − reserved (units held for orders awaiting payment). Every change is recorded below."
      />

      <section aria-label="Stock summary" className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Units available" value={totals.available.toLocaleString("en-US")} hint={`${totals.onHand} on hand · ${totals.reserved} reserved`} />
        <StatCard label="Variants tracked" value={stock.length} hint={`${stock.filter((s) => s.isActive).length} currently sellable`} />
        <StatCard label="Low stock" value={totals.low} hint="At or below threshold" />
        <StatCard label="Sold out" value={totals.out} hint="Nothing available to order" />
      </section>

      <Panel id="stock" title="Stock levels" description="Low-stock rows are highlighted amber, sold-out rows coral.">
        {stock.length === 0 ? (
          <EmptyState icon={<StackIcon size={20} />} title="No variants yet" description="Create a product and add variants to start tracking stock." />
        ) : (
          <InventoryTable
            rows={stock.map((s) => ({
              variantId: s.variantId,
              sku: s.sku,
              name: s.name,
              productName: s.productName,
              colorHex: s.colorHex,
              accentHex: s.accentHex,
              isActive: s.isActive,
              onHand: s.onHand,
              reserved: s.reserved,
              available: s.available,
              lowStockThreshold: s.lowStockThreshold,
              status: s.status,
              updatedLabel: s.updatedAt ? formatDate(s.updatedAt, true) : null,
            }))}
          />
        )}
      </Panel>

      <Panel
        id="movements"
        className="mt-6 scroll-mt-20"
        title="Movement history"
        description={selected ? `Latest 50 movements for ${selected.sku}` : "Latest 50 stock movements across all variants"}
        actions={<MovementFilter value={variantId ?? ""} options={stock.map((s) => ({ value: s.variantId, label: `${s.sku} — ${s.name}` }))} />}
      >
        {movements.length === 0 ? (
          <EmptyState
            icon={<StackIcon size={20} />}
            title="No movements"
            description={selected ? "This variant has no recorded stock changes yet." : "Stock changes will be listed here."}
          />
        ) : (
          <TableScroll label="Inventory movements">
            <table className={`${tableClass} min-w-[58rem]`}>
              <thead className={theadClass}>
                <tr>
                  <th scope="col" className={thClass}>When</th>
                  <th scope="col" className={thClass}>Variant</th>
                  <th scope="col" className={thClass}>Reason</th>
                  <th scope="col" className={`${thClass} text-right`}>On hand Δ</th>
                  <th scope="col" className={`${thClass} text-right`}>Reserved Δ</th>
                  <th scope="col" className={`${thClass} text-right`}>On hand after</th>
                  <th scope="col" className={thClass}>Order</th>
                  <th scope="col" className={thClass}>By</th>
                  <th scope="col" className={thClass}>Note</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className={trClass}>
                    <td className={`${tdClass} whitespace-nowrap text-graphite/70`}>
                      <time dateTime={m.createdAt.toISOString()}>
                        <span className="block">{formatDate(m.createdAt)}</span>
                        <span className="block text-xs text-graphite/55">{formatTime(m.createdAt)}</span>
                      </time>
                    </td>
                    <th scope="row" className={`${tdClass} font-normal`}>
                      <span className="block whitespace-nowrap font-mono text-xs font-medium text-graphite">{m.sku}</span>
                      <span className="block max-w-[12rem] truncate text-xs text-graphite/60">{m.variantName}</span>
                    </th>
                    <td className={tdClass}>
                      <ReasonBadge reason={m.reason} />
                    </td>
                    <td
                      className={`${tdClass} tabular text-right font-medium ${m.onHandDelta > 0 ? "text-[#1d6b4f]" : m.onHandDelta < 0 ? "text-[#a5321a]" : "text-graphite/45"}`}
                    >
                      {formatDelta(m.onHandDelta)}
                    </td>
                    <td className={`${tdClass} tabular text-right ${m.reservedDelta === 0 ? "text-graphite/45" : "text-graphite"}`}>{formatDelta(m.reservedDelta)}</td>
                    <td className={`${tdClass} tabular text-right`}>
                      {m.onHandAfter}
                      {m.reservedAfter > 0 && <span className="block text-xs text-graphite/55">{m.reservedAfter} reserved</span>}
                    </td>
                    <td className={`${tdClass} whitespace-nowrap`}>
                      {m.orderId && m.orderNumber ? (
                        <Link
                          href={`/admin/orders/${m.orderId}`}
                          className="font-mono text-xs font-medium text-forest underline decoration-forest/25 underline-offset-4 hover:decoration-forest"
                        >
                          {m.orderNumber}
                        </Link>
                      ) : (
                        <span className="text-graphite/40">—</span>
                      )}
                    </td>
                    <td className={`${tdClass} whitespace-nowrap text-graphite/75`}>{movementActor(m)}</td>
                    <td className={`${tdClass} min-w-[9rem] max-w-[14rem] text-xs text-graphite/70`}>
                      <span className="line-clamp-2 break-words" title={m.note ?? undefined}>
                        {m.note ?? "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Panel>
    </>
  );
}
