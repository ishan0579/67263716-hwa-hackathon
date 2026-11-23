import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { isUuid } from "@/components/admin/format";
import { ProductActiveToggle } from "@/components/admin/product-active-toggle";
import { ProductForm } from "@/components/admin/product-form";
import { PageHeader } from "@/components/admin/ui";
import { VariantsManager } from "@/components/admin/variants-manager";
import { Breadcrumbs } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";
import { getCurrentAdmin, requireAdminPage } from "@/server/auth/session";
import { getProductAdmin } from "@/server/services/admin";

type Params = Promise<{ id: string }>;

const loadProduct = cache(async (id: string) => (isUuid(id) ? getProductAdmin(id) : null));

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  if (!(await getCurrentAdmin())) return { title: "Product" };
  const data = await loadProduct((await params).id);
  return { title: data ? `Edit ${data.product.name}` : "Product not found" };
}

export default async function AdminEditProductPage({ params }: { params: Params }) {
  await requireAdminPage();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const data = await loadProduct(id);
  if (!data) notFound();
  const { product, variants } = data;

  return (
    <>
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[{ href: "/admin/products", label: "Products" }, { label: product.name }]} />}
        title={product.name}
        meta={
          <>
            <span className="font-mono text-xs">/product/{product.slug}</span>
            <span aria-hidden="true" className="text-graphite/30">
              ·
            </span>
            <span>Updated {formatDate(product.updatedAt, true)}</span>
          </>
        }
        actions={<ProductActiveToggle productId={product.id} isActive={product.isActive} activeVariantCount={variants.filter((v) => v.isActive).length} />}
      />

      <div className="flex flex-col gap-10">
        <VariantsManager
          productId={product.id}
          variants={variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            name: v.name,
            colorKey: v.colorKey,
            colorName: v.colorName,
            colorHex: v.colorHex,
            accentHex: v.accentHex,
            size: v.size,
            sizeLabel: v.sizeLabel,
            priceCents: v.priceCents,
            isActive: v.isActive,
            sortOrder: v.sortOrder,
            onHand: v.onHand,
            reserved: v.reserved,
            lowStockThreshold: v.lowStockThreshold,
          }))}
        />

        <section aria-labelledby="details-heading" className="flex flex-col gap-4">
          <div>
            <h2 id="details-heading" className="font-display text-xl font-semibold tracking-tight text-forest">
              Product details
            </h2>
            <p className="mt-1 text-sm text-graphite/65">Name, copy, highlights and specifications shown on the product page.</p>
          </div>
          <ProductForm
            mode="edit"
            productId={product.id}
            initial={{
              name: product.name,
              slug: product.slug,
              tagline: product.tagline,
              description: product.description,
              conceptNotice: product.conceptNotice,
              highlights: product.highlights,
              specifications: product.specifications,
              isActive: product.isActive,
            }}
          />
        </section>
      </div>
    </>
  );
}
