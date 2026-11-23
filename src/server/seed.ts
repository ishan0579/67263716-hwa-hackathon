/**
 * Idempotent demo-data seeding, shared by `npm run db:seed` and the test suite.
 * Re-running never duplicates rows and never resets stock that has already
 * been sold or adjusted.
 */
import { eq } from "drizzle-orm";
import type { Db } from "./db";
import { adminUsers, inventory, inventoryMovements, productImages, products, productVariants, siteConfig } from "./db/schema";
import { COLORWAYS, PRODUCT_COPY, PRODUCT_SLUG, PRODUCT_SPECS, SEED_STOCK, SIZES } from "@/content/product";
import { DEFAULT_SHIPPING } from "./services/config";
import { hashPassword } from "./auth/password";

export async function seedCatalog(db: Db) {
  const [product] = await db
    .insert(products)
    .values({
      slug: PRODUCT_SLUG,
      name: PRODUCT_COPY.name,
      tagline: PRODUCT_COPY.tagline,
      description: PRODUCT_COPY.description,
      conceptNotice: PRODUCT_COPY.conceptNotice,
      highlights: PRODUCT_COPY.highlights,
      specifications: PRODUCT_SPECS,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: products.slug,
      set: { updatedAt: new Date() },
    })
    .returning();

  let sort = 0;
  const variantIds: Record<string, string> = {};
  for (const c of COLORWAYS) {
    for (const s of SIZES) {
      const sku = `SO1-${c.key.split("-").map((w) => w[0]!.toUpperCase()).join("")}-${s.key === "standard" ? "STD" : "LRG"}`;
      const [v] = await db
        .insert(productVariants)
        .values({
          productId: product!.id,
          sku,
          name: `${c.name} · ${s.key === "standard" ? "Standard" : "Large"}`,
          colorKey: c.key,
          colorName: c.name,
          colorHex: c.colorHex,
          accentHex: c.accentHex,
          size: s.key,
          sizeLabel: s.label,
          priceCents: s.priceCents,
          sortOrder: sort++,
        })
        .onConflictDoUpdate({ target: productVariants.sku, set: { updatedAt: new Date() } })
        .returning();
      variantIds[`${c.key}:${s.key}`] = v!.id;

      const qty = SEED_STOCK[c.key]?.[s.key] ?? 0;
      const inserted = await db
        .insert(inventory)
        .values({ variantId: v!.id, onHand: qty, reserved: 0, lowStockThreshold: 5 })
        .onConflictDoNothing()
        .returning();
      if (inserted.length) {
        await db.insert(inventoryMovements).values({
          variantId: v!.id,
          reason: "initial_stock",
          onHandDelta: qty,
          reservedDelta: 0,
          onHandAfter: qty,
          reservedAfter: 0,
          note: "Demo seed stock",
        });
      }
    }
  }

  // Product imagery: real renders of the procedural 3D model (see scripts/render-products.ts).
  const existingImages = await db.select({ id: productImages.id }).from(productImages).where(eq(productImages.productId, product!.id));
  if (!existingImages.length) {
    await db.insert(productImages).values(
      COLORWAYS.map((c, i) => ({
        productId: product!.id,
        variantId: variantIds[`${c.key}:standard`],
        url: `/images/renders/${c.key}.png`,
        alt: `SniffOrbit ONE in ${c.name} — ${c.description.toLowerCase()} — three-quarter view render`,
        width: 1200,
        height: 1200,
        sortOrder: i,
      })),
    );
  }

  await db
    .insert(siteConfig)
    .values({ key: "shipping", value: DEFAULT_SHIPPING, description: "Shipping methods and rates (demo)" })
    .onConflictDoNothing();
  await db
    .insert(siteConfig)
    .values({
      key: "store",
      value: { demoMode: true, currency: "USD" },
      description: "Store-wide flags",
    })
    .onConflictDoNothing();

  return { productId: product!.id, variantIds };
}

export async function upsertAdmin(db: Db, email: string, password: string, name: string) {
  const passwordHash = await hashPassword(password);
  const [row] = await db
    .insert(adminUsers)
    .values({ email: email.toLowerCase(), name, passwordHash })
    .onConflictDoUpdate({ target: adminUsers.email, set: { passwordHash, name, isActive: true, updatedAt: new Date() } })
    .returning({ id: adminUsers.id, email: adminUsers.email });
  return row!;
}
