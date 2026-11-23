import Link from "next/link";
import { ActiveBadge } from "@/components/admin/badges";
import { BoxIcon } from "@/components/admin/icons";
import { EmptyState, Panel, PageHeader, TableScroll, tableClass, tdClass, theadClass, thClass, trClass } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/button";
import { Plus } from "@/components/ui/icons";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { requireAdminPage } from "@/server/auth/session";
import { listProductsAdmin } from "@/server/services/admin";

export const metadata = { title: "Products" };

function priceRange(min: number | null, max: number | null) {
  if (min === null || max === null) return <span className="text-graphite/45">—</span>;
  if (min === max) return formatMoney(min, "USD", { exact: true });
  return `${formatMoney(min, "USD", { exact: true })} – ${formatMoney(max, "USD", { exact: true })}`;
}

export default async function AdminProductsPage() {
  await requireAdminPage();
  const products = await listProductsAdmin();

  const newButton = (
    <ButtonLink href="/admin/products/new" variant="dark" size="sm" icon={<Plus size={16} />}>
      New product
    </ButtonLink>
  );

  return (
    <>
      <PageHeader title="Products" description="Catalogue entries and their colour / size variants. Inactive products are hidden from the store." actions={newButton} />

      <Panel title="All products" description={`${products.length} product${products.length === 1 ? "" : "s"}`}>
        {products.length === 0 ? (
          <EmptyState icon={<BoxIcon size={20} />} title="No products yet" description="Create your first product, then add colour and size variants." action={newButton} />
        ) : (
          <TableScroll label="Products">
            <table className={`${tableClass} min-w-[54rem]`}>
              <thead className={theadClass}>
                <tr>
                  <th scope="col" className={thClass}>Product</th>
                  <th scope="col" className={thClass}>Slug</th>
                  <th scope="col" className={thClass}>Status</th>
                  <th scope="col" className={`${thClass} text-right`}>Variants</th>
                  <th scope="col" className={`${thClass} text-right`}>Price range</th>
                  <th scope="col" className={`${thClass} text-right`}>Available</th>
                  <th scope="col" className={thClass}>Updated</th>
                  <th scope="col" className={`${thClass} text-right`}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className={`${trClass} hover:bg-sand/25`}>
                    <th scope="row" className={`${tdClass} font-normal`}>
                      <Link href={`/admin/products/${p.id}`} className="font-medium text-forest underline decoration-forest/25 underline-offset-4 hover:decoration-forest">
                        {p.name}
                      </Link>
                      {p.tagline && <span className="mt-0.5 block max-w-[22rem] truncate text-xs text-graphite/60">{p.tagline}</span>}
                    </th>
                    <td className={`${tdClass} font-mono text-xs text-graphite/70`}>{p.slug}</td>
                    <td className={tdClass}>
                      <ActiveBadge active={p.isActive} />
                    </td>
                    <td className={`${tdClass} tabular whitespace-nowrap text-right`}>
                      {p.activeVariantCount}
                      <span className="text-graphite/45"> / {p.variantCount}</span>
                      <span className="sr-only"> active</span>
                    </td>
                    <td className={`${tdClass} tabular whitespace-nowrap text-right`}>{priceRange(p.priceMin, p.priceMax)}</td>
                    <td className={`${tdClass} tabular text-right font-medium`}>{p.totalAvailable.toLocaleString("en-US")}</td>
                    <td className={`${tdClass} whitespace-nowrap text-graphite/65`}>{formatDate(p.updatedAt)}</td>
                    <td className={`${tdClass} text-right`}>
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="inline-flex h-9 items-center rounded-full border border-graphite/15 px-3.5 text-sm font-medium text-forest transition-colors hover:border-forest/40 hover:bg-forest/[0.04]"
                      >
                        Edit<span className="sr-only"> {p.name}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Panel>
      <p className="mt-3 text-xs text-graphite/55">Variants column shows active / total. Available = on hand − reserved, across all variants.</p>
    </>
  );
}
