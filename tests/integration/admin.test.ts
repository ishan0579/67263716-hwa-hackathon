import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/server/db";
import { inventory, inventoryMovements, products } from "@/server/db/schema";
import {
  adjustInventory,
  createProduct,
  createVariant,
  getDashboardStats,
  listOrders,
  updateProduct,
  updateVariant,
} from "@/server/services/admin";
import { createOrder } from "@/server/services/orders";
import { getProductBySlug } from "@/server/services/catalog";
import { checkoutInput, newKey, resetDatabase } from "../support/fixtures";

let ids: Record<string, string>;
let adminId: string;
let productId: string;

beforeEach(async () => {
  const r = await resetDatabase();
  ids = r.variantIds;
  adminId = r.adminId;
  productId = r.productId;
});

describe("inventory administration", () => {
  it("sets and adjusts stock with an audit trail", async () => {
    const variantId = ids["fresh-trail:large"]!;
    await adjustInventory({ variantId, mode: "set", value: 30, reason: "restock", note: "Count" }, adminId);
    await adjustInventory({ variantId, mode: "delta", value: -5, reason: "adjustment", note: "Damaged" }, adminId);
    const [row] = await getDb().select().from(inventory).where(eq(inventory.variantId, variantId));
    expect(row!.onHand).toBe(25);
    const moves = await getDb().select().from(inventoryMovements).where(eq(inventoryMovements.variantId, variantId));
    expect(moves.map((m) => m.onHandDelta).sort((a, b) => a - b)).toEqual([-5, 4, 26]);
  });

  it("refuses to drop on-hand stock below reserved units", async () => {
    const variantId = ids["deep-woods:large"]!;
    await createOrder(checkoutInput([{ variantId, quantity: 3 }]), { idempotencyKey: newKey(), provider: "stripe" });
    await expect(adjustInventory({ variantId, mode: "set", value: 2, reason: "adjustment" }, adminId)).rejects.toMatchObject({
      code: "below_reserved",
    });
  });
});

describe("product administration", () => {
  it("edits product copy, price and active state, reflected in the storefront", async () => {
    await updateProduct(productId, { tagline: "Updated tagline" });
    await updateVariant(ids["morning-walk:standard"]!, { priceCents: 11900 });
    await updateVariant(ids["deep-woods:large"]!, { isActive: false });
    const p = await getProductBySlug("snifforbit-one");
    expect(p!.tagline).toBe("Updated tagline");
    expect(p!.variants.find((v) => v.id === ids["morning-walk:standard"])!.priceCents).toBe(11900);
    expect(p!.variants.find((v) => v.id === ids["deep-woods:large"])).toBeUndefined();

    await updateProduct(productId, { isActive: false });
    expect(await getProductBySlug("snifforbit-one")).toBeNull();
  });

  it("creates products and variants with initial stock, rejecting duplicates", async () => {
    const p = await createProduct({
      name: "SniffOrbit Insert Kit",
      slug: "insert-kit",
      tagline: "",
      description: "",
      conceptNotice: "",
      highlights: [],
      specifications: [],
      isActive: false,
    });
    const v = await createVariant(
      p!.id,
      {
        sku: "SOK-STD",
        name: "Kit · Standard",
        colorKey: "natural",
        colorName: "Natural",
        colorHex: "#F7F3EA",
        accentHex: "#B9E5DB",
        size: "standard",
        sizeLabel: "Standard",
        priceCents: 2400,
        isActive: true,
        sortOrder: 0,
        initialStock: 15,
        lowStockThreshold: 3,
      },
      adminId,
    );
    const [inv] = await getDb().select().from(inventory).where(eq(inventory.variantId, v!.id));
    expect(inv!.onHand).toBe(15);

    await expect(
      createProduct({
        name: "Dup",
        slug: "insert-kit",
        tagline: "",
        description: "",
        conceptNotice: "",
        highlights: [],
        specifications: [],
        isActive: false,
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect((await getDb().select().from(products)).length).toBe(2);
  });
});

describe("dashboard & order search", () => {
  it("aggregates test revenue and finds orders by name, email or reference", async () => {
    const a = await createOrder(checkoutInput([{ variantId: ids["morning-walk:standard"]!, quantity: 1 }]), {
      idempotencyKey: newKey(),
      provider: "test_mode",
    });
    await createOrder(
      checkoutInput([{ variantId: ids["deep-woods:standard"]!, quantity: 1 }], {
        contact: { email: "linus@example.com", firstName: "Linus", lastName: "Pauling", phone: "" },
      }),
      { idempotencyKey: newKey(), provider: "test_mode" },
    );
    const stats = await getDashboardStats();
    expect(stats.totalOrders).toBe(2);
    expect(stats.testRevenueCents).toBe(2 * 13800);
    expect(stats.lowStock.some((s) => s.variantId === ids["sunset-fetch:large"])).toBe(true);

    expect((await listOrders({ q: "linus" })).total).toBe(1);
    expect((await listOrders({ q: "Ada Lovelace" })).total).toBe(1);
    expect((await listOrders({ q: a.orderNumber })).rows[0]!.orderNumber).toBe(a.orderNumber);
    expect((await listOrders({ status: "shipped" })).total).toBe(0);
  });
});
