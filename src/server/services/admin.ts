/**
 * Admin-only data access. Every caller must have authenticated the admin first
 * (requireAdminPage / requireAdminApi). These functions never trust client
 * input beyond what the zod schemas in lib/validation/admin.ts allow.
 */
import { and, asc, count, desc, eq, gte, ilike, inArray, or, sql, sum, type SQL } from "drizzle-orm";
import { db } from "../db";
import {
  adminUsers,
  contactSubmissions,
  inventory,
  inventoryMovements,
  orderItems,
  orders,
  orderStatusEvents,
  payments,
  products,
  productVariants,
  type OrderStatus,
} from "../db/schema";
import { ApiError } from "../http";
import { stockStatusFor } from "./catalog";
import { adminAllowedTransitions, transitionOrder } from "./orders";
import type { z } from "zod";
import type {
  inventoryAdjustmentSchema,
  productInputSchema,
  productUpdateSchema,
  variantInputSchema,
  variantUpdateSchema,
} from "@/lib/validation/admin";

/* ───────────────────────────── Dashboard ───────────────────────────── */

export async function getDashboardStats() {
  const [totals] = await db
    .select({
      orders: count(),
      revenue: sum(sql`CASE WHEN ${orders.status} <> 'cancelled' THEN ${orders.totalCents} ELSE 0 END`),
    })
    .from(orders);
  const [last7] = await db
    .select({ orders: count() })
    .from(orders)
    .where(gte(orders.createdAt, sql`now() - interval '7 days'`));
  const byStatus = await db
    .select({ status: orders.status, n: count() })
    .from(orders)
    .groupBy(orders.status);
  const recentOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      firstName: orders.firstName,
      lastName: orders.lastName,
      totalCents: orders.totalCents,
      status: orders.status,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(6);
  const stock = await listInventory();
  const lowStock = stock.filter((s) => s.status !== "in_stock");
  const [productCounts] = await db
    .select({
      total: count(),
      active: sum(sql`CASE WHEN ${products.isActive} THEN 1 ELSE 0 END`),
    })
    .from(products);
  const [variantCount] = await db.select({ n: count() }).from(productVariants);
  const [newMessages] = await db
    .select({ n: count() })
    .from(contactSubmissions)
    .where(eq(contactSubmissions.status, "new"));

  const recentEvents = await db
    .select({
      id: orderStatusEvents.id,
      toStatus: orderStatusEvents.toStatus,
      actor: orderStatusEvents.actor,
      createdAt: orderStatusEvents.createdAt,
      orderNumber: orders.orderNumber,
      orderId: orders.id,
      adminName: adminUsers.name,
    })
    .from(orderStatusEvents)
    .innerJoin(orders, eq(orders.id, orderStatusEvents.orderId))
    .leftJoin(adminUsers, eq(adminUsers.id, orderStatusEvents.adminUserId))
    .orderBy(desc(orderStatusEvents.createdAt))
    .limit(8);

  const recentMovements = await db
    .select({
      id: inventoryMovements.id,
      reason: inventoryMovements.reason,
      onHandDelta: inventoryMovements.onHandDelta,
      reservedDelta: inventoryMovements.reservedDelta,
      createdAt: inventoryMovements.createdAt,
      sku: productVariants.sku,
    })
    .from(inventoryMovements)
    .innerJoin(productVariants, eq(productVariants.id, inventoryMovements.variantId))
    .orderBy(desc(inventoryMovements.createdAt))
    .limit(6);

  return {
    totalOrders: totals?.orders ?? 0,
    testRevenueCents: Number(totals?.revenue ?? 0),
    ordersLast7Days: last7?.orders ?? 0,
    byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r.n])) as Partial<Record<OrderStatus, number>>,
    recentOrders,
    lowStock,
    products: { total: productCounts?.total ?? 0, active: Number(productCounts?.active ?? 0), variants: variantCount?.n ?? 0 },
    newMessages: newMessages?.n ?? 0,
    recentEvents,
    recentMovements,
  };
}

/* ─────────────────────────────── Orders ─────────────────────────────── */

export async function listOrders(opts: { q?: string; status?: OrderStatus | "all"; page?: number; pageSize?: number }) {
  const pageSize = Math.min(opts.pageSize ?? 20, 100);
  const page = Math.max(1, opts.page ?? 1);
  const filters: SQL[] = [];
  if (opts.status && opts.status !== "all") filters.push(eq(orders.status, opts.status));
  const q = opts.q?.trim();
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    filters.push(
      or(
        ilike(orders.orderNumber, like),
        ilike(orders.email, like),
        ilike(orders.firstName, like),
        ilike(orders.lastName, like),
        ilike(sql`${orders.firstName} || ' ' || ${orders.lastName}`, like),
      )!,
    );
  }
  const where = filters.length ? and(...filters) : undefined;
  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        email: orders.email,
        firstName: orders.firstName,
        lastName: orders.lastName,
        status: orders.status,
        totalCents: orders.totalCents,
        paymentProvider: orders.paymentProvider,
        createdAt: orders.createdAt,
        itemCount: sql<number>`(SELECT COALESCE(SUM(quantity),0)::int FROM ${orderItems} WHERE ${orderItems.orderId} = ${orders.id})`,
      })
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ n: count() }).from(orders).where(where),
  ]);
  return { rows, total: total?.n ?? 0, page, pageSize };
}

export async function getOrderAdmin(id: string) {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, id) });
  if (!order) return null;
  const [items, events, pays] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)),
    db
      .select({
        id: orderStatusEvents.id,
        fromStatus: orderStatusEvents.fromStatus,
        toStatus: orderStatusEvents.toStatus,
        actor: orderStatusEvents.actor,
        note: orderStatusEvents.note,
        createdAt: orderStatusEvents.createdAt,
        adminName: adminUsers.name,
      })
      .from(orderStatusEvents)
      .leftJoin(adminUsers, eq(adminUsers.id, orderStatusEvents.adminUserId))
      .where(eq(orderStatusEvents.orderId, id))
      .orderBy(asc(orderStatusEvents.createdAt)),
    db.select().from(payments).where(eq(payments.orderId, id)).orderBy(desc(payments.createdAt)),
  ]);
  return { order, items, events, payments: pays, allowedTransitions: adminAllowedTransitions(order.status) };
}

export async function updateOrderStatusAdmin(id: string, status: OrderStatus, note: string | undefined, adminUserId: string) {
  return db.transaction(async (tx) => {
    const updated = await transitionOrder(tx, id, status, { actor: "admin", adminUserId, note });
    if (status === "cancelled") {
      await tx
        .update(payments)
        .set({ status: "expired" })
        .where(and(eq(payments.orderId, id), eq(payments.status, "pending")));
    }
    return updated;
  });
}

/* ────────────────────────────── Products ────────────────────────────── */

export async function listProductsAdmin() {
  const list = await db.select().from(products).orderBy(asc(products.createdAt));
  const variants = await db
    .select({ v: productVariants, inv: inventory })
    .from(productVariants)
    .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
    .orderBy(asc(productVariants.sortOrder));
  return list.map((p) => {
    const vs = variants.filter((r) => r.v.productId === p.id);
    const prices = vs.map((r) => r.v.priceCents);
    return {
      ...p,
      variantCount: vs.length,
      activeVariantCount: vs.filter((r) => r.v.isActive).length,
      totalAvailable: vs.reduce((s, r) => s + (r.inv ? r.inv.onHand - r.inv.reserved : 0), 0),
      priceMin: prices.length ? Math.min(...prices) : null,
      priceMax: prices.length ? Math.max(...prices) : null,
    };
  });
}

export async function getProductAdmin(id: string) {
  const product = await db.query.products.findFirst({ where: eq(products.id, id) });
  if (!product) return null;
  const variants = await db
    .select({ v: productVariants, inv: inventory })
    .from(productVariants)
    .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
    .where(eq(productVariants.productId, id))
    .orderBy(asc(productVariants.sortOrder), asc(productVariants.createdAt));
  return {
    product,
    variants: variants.map((r) => ({
      ...r.v,
      onHand: r.inv?.onHand ?? 0,
      reserved: r.inv?.reserved ?? 0,
      lowStockThreshold: r.inv?.lowStockThreshold ?? 0,
    })),
  };
}

function rethrowUnique(err: unknown, message: string): never {
  const e = err as { code?: string; cause?: { code?: string } };
  if (e?.code === "23505" || e?.cause?.code === "23505") throw new ApiError(409, "conflict", message);
  throw err;
}

export async function createProduct(input: z.output<typeof productInputSchema>) {
  try {
    const [row] = await db.insert(products).values(input).returning();
    return row!;
  } catch (err) {
    rethrowUnique(err, "A product with that slug already exists.");
  }
}

export async function updateProduct(id: string, input: z.output<typeof productUpdateSchema>) {
  try {
    const [row] = await db.update(products).set(input).where(eq(products.id, id)).returning();
    if (!row) throw new ApiError(404, "not_found", "Product not found.");
    return row;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    rethrowUnique(err, "A product with that slug already exists.");
  }
}

export async function createVariant(productId: string, input: z.output<typeof variantInputSchema>, adminUserId: string) {
  const product = await db.query.products.findFirst({ where: eq(products.id, productId), columns: { id: true } });
  if (!product) throw new ApiError(404, "not_found", "Product not found.");
  const { initialStock, lowStockThreshold, ...variant } = input;
  try {
    return await db.transaction(async (tx) => {
      const [v] = await tx.insert(productVariants).values({ ...variant, productId }).returning();
      await tx.insert(inventory).values({ variantId: v!.id, onHand: initialStock, reserved: 0, lowStockThreshold });
      await tx.insert(inventoryMovements).values({
        variantId: v!.id,
        reason: "initial_stock",
        onHandDelta: initialStock,
        reservedDelta: 0,
        onHandAfter: initialStock,
        reservedAfter: 0,
        adminUserId,
        note: "Variant created",
      });
      return v!;
    });
  } catch (err) {
    rethrowUnique(err, "That SKU, or that colour + size combination, already exists.");
  }
}

export async function updateVariant(id: string, input: z.output<typeof variantUpdateSchema>) {
  try {
    const [row] = await db.update(productVariants).set(input).where(eq(productVariants.id, id)).returning();
    if (!row) throw new ApiError(404, "not_found", "Variant not found.");
    return row;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    rethrowUnique(err, "That SKU, or that colour + size combination, already exists.");
  }
}

/* ───────────────────────────── Inventory ───────────────────────────── */

export async function listInventory() {
  const rows = await db
    .select({ v: productVariants, inv: inventory, productName: products.name, productActive: products.isActive })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
    .orderBy(asc(products.name), asc(productVariants.sortOrder));
  return rows.map((r) => {
    const onHand = r.inv?.onHand ?? 0;
    const reserved = r.inv?.reserved ?? 0;
    const threshold = r.inv?.lowStockThreshold ?? 0;
    return {
      variantId: r.v.id,
      sku: r.v.sku,
      name: r.v.name,
      productName: r.productName,
      colorHex: r.v.colorHex,
      accentHex: r.v.accentHex,
      isActive: r.v.isActive && r.productActive,
      onHand,
      reserved,
      available: onHand - reserved,
      lowStockThreshold: threshold,
      status: stockStatusFor(onHand - reserved, threshold),
      updatedAt: r.inv?.updatedAt ?? null,
    };
  });
}

export async function adjustInventory(input: z.output<typeof inventoryAdjustmentSchema>, adminUserId: string) {
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(inventory).where(eq(inventory.variantId, input.variantId)).for("update");
    if (!current) throw new ApiError(404, "not_found", "Inventory record not found.");
    const delta = input.mode === "set" ? input.value - current.onHand : input.value;
    const nextOnHand = current.onHand + delta;
    if (nextOnHand < current.reserved) {
      throw new ApiError(
        409,
        "below_reserved",
        `On-hand stock can't go below the ${current.reserved} unit(s) reserved for pending orders.`,
      );
    }
    const [updated] = await tx
      .update(inventory)
      .set({
        onHand: nextOnHand,
        ...(input.lowStockThreshold !== undefined ? { lowStockThreshold: input.lowStockThreshold } : {}),
      })
      .where(eq(inventory.variantId, input.variantId))
      .returning();
    if (delta !== 0) {
      await tx.insert(inventoryMovements).values({
        variantId: input.variantId,
        reason: input.reason,
        onHandDelta: delta,
        reservedDelta: 0,
        onHandAfter: updated!.onHand,
        reservedAfter: updated!.reserved,
        adminUserId,
        note: input.note || null,
      });
    }
    return updated!;
  });
}

export async function listMovements(opts: { variantId?: string; limit?: number } = {}) {
  const limit = Math.min(opts.limit ?? 50, 200);
  return db
    .select({
      id: inventoryMovements.id,
      reason: inventoryMovements.reason,
      onHandDelta: inventoryMovements.onHandDelta,
      reservedDelta: inventoryMovements.reservedDelta,
      onHandAfter: inventoryMovements.onHandAfter,
      reservedAfter: inventoryMovements.reservedAfter,
      note: inventoryMovements.note,
      createdAt: inventoryMovements.createdAt,
      sku: productVariants.sku,
      variantName: productVariants.name,
      orderNumber: orders.orderNumber,
      orderId: orders.id,
      adminName: adminUsers.name,
    })
    .from(inventoryMovements)
    .innerJoin(productVariants, eq(productVariants.id, inventoryMovements.variantId))
    .leftJoin(orders, eq(orders.id, inventoryMovements.orderId))
    .leftJoin(adminUsers, eq(adminUsers.id, inventoryMovements.adminUserId))
    .where(opts.variantId ? eq(inventoryMovements.variantId, opts.variantId) : undefined)
    .orderBy(desc(inventoryMovements.createdAt))
    .limit(limit);
}

export async function variantIdsExist(ids: string[]) {
  if (!ids.length) return true;
  const rows = await db.select({ id: productVariants.id }).from(productVariants).where(inArray(productVariants.id, ids));
  return rows.length === new Set(ids).size;
}
