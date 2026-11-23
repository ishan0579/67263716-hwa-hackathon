import { and, asc, eq, inArray } from "drizzle-orm";
import { db as rootDb, type DbOrTx } from "../db";
import { inventory, productImages, products, productVariants } from "../db/schema";
import { MAX_QTY_PER_LINE } from "@/lib/validation/checkout";

export type StockStatus = "in_stock" | "low_stock" | "sold_out";

export type PublicVariant = {
  id: string;
  sku: string;
  name: string;
  colorKey: string;
  colorName: string;
  colorHex: string;
  accentHex: string;
  size: string;
  sizeLabel: string;
  priceCents: number;
  stockStatus: StockStatus;
  /** Exact count only revealed when stock is low. */
  lowStockCount: number | null;
  maxQuantity: number;
};

export type PublicProduct = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  conceptNotice: string;
  highlights: string[];
  specifications: { group: string; label: string; value: string; provisional?: boolean }[];
  variants: PublicVariant[];
  images: { url: string; alt: string; width: number; height: number; variantId: string | null }[];
  priceFromCents: number;
};

export function stockStatusFor(available: number, threshold: number): StockStatus {
  if (available <= 0) return "sold_out";
  if (available <= threshold) return "low_stock";
  return "in_stock";
}

export function toPublicVariant(
  v: typeof productVariants.$inferSelect,
  inv: { onHand: number; reserved: number; lowStockThreshold: number } | null,
): PublicVariant {
  const available = inv ? inv.onHand - inv.reserved : 0;
  const status = stockStatusFor(available, inv?.lowStockThreshold ?? 0);
  return {
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
    stockStatus: status,
    lowStockCount: status === "low_stock" ? available : null,
    maxQuantity: Math.max(0, Math.min(available, MAX_QTY_PER_LINE)),
  };
}

/** Active product with active variants and live availability, or null. */
export async function getProductBySlug(slug: string, db: DbOrTx = rootDb): Promise<PublicProduct | null> {
  const product = await db.query.products.findFirst({
    where: and(eq(products.slug, slug), eq(products.isActive, true)),
  });
  if (!product) return null;

  const rows = await db
    .select({ v: productVariants, inv: inventory })
    .from(productVariants)
    .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
    .where(and(eq(productVariants.productId, product.id), eq(productVariants.isActive, true)))
    .orderBy(asc(productVariants.sortOrder), asc(productVariants.createdAt));

  const images = await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, product.id))
    .orderBy(asc(productImages.sortOrder));

  const variants = rows.map((r) => toPublicVariant(r.v, r.inv));
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    tagline: product.tagline,
    description: product.description,
    conceptNotice: product.conceptNotice,
    highlights: product.highlights,
    specifications: product.specifications,
    variants,
    images: images.map((i) => ({ url: i.url, alt: i.alt, width: i.width, height: i.height, variantId: i.variantId })),
    priceFromCents: variants.length ? Math.min(...variants.map((v) => v.priceCents)) : 0,
  };
}

export async function listActiveProducts(db: DbOrTx = rootDb) {
  const list = await db.query.products.findMany({
    where: eq(products.isActive, true),
    orderBy: asc(products.createdAt),
  });
  return Promise.all(list.map((p) => getProductBySlug(p.slug, db))).then((r) => r.filter(Boolean) as PublicProduct[]);
}

export async function getVariantAvailability(variantIds: string[], db: DbOrTx = rootDb) {
  if (!variantIds.length) return [];
  const rows = await db
    .select({ v: productVariants, inv: inventory, productActive: products.isActive })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
    .where(inArray(productVariants.id, variantIds));
  return rows.map((r) => ({
    ...toPublicVariant(r.v, r.inv),
    purchasable: r.v.isActive && r.productActive,
  }));
}
