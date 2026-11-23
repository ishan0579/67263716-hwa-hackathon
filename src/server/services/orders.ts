/**
 * Order lifecycle.
 *
 * createOrder() — the checkout write path:
 *   1. Input is validated by the caller (zod `checkoutSchema`).
 *   2. A transaction takes an advisory lock on the idempotency key, so a
 *      double-clicked or retried submission can never create two orders.
 *   3. Inventory rows for every requested variant are locked `FOR UPDATE`
 *      in a deterministic order (no deadlocks, no overselling under
 *      concurrent checkouts).
 *   4. Prices, names and availability are read from the database via
 *      quoteCart(); totals are computed on the server.
 *   5. Customer upsert, order, items, inventory movements, status event and
 *      payment record are written atomically.
 *   6. A 100-bit guest tracking key is returned once; only its hash is stored.
 */
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db as rootDb, type DbOrTx } from "../db";
import {
  customers,
  inventory,
  inventoryMovements,
  orderItems,
  orders,
  orderStatusEvents,
  payments,
  type InventoryReason,
  type Order,
  type OrderStatus,
  type PaymentProvider,
} from "../db/schema";
import {
  deriveTrackingKey,
  formatTrackingKey,
  generateOrderNumber,
  hashTrackingKey,
  normaliseTrackingKey,
  safeEqualHex,
  sha256Hex,
} from "../crypto";
import { ApiError } from "../http";
import type { CheckoutInput } from "@/lib/validation/checkout";
import { describeIssue, mergeLines, quoteCart } from "./quote";

export type CreateOrderResult = {
  orderId: string;
  orderNumber: string;
  /** Formatted tracking key, e.g. K7QM-2XPA-9RTD-HW4B-NC3E. Null only if it can't be re-derived. */
  trackingKey: string | null;
  status: OrderStatus;
  paymentProvider: PaymentProvider;
  totalCents: number;
  replayed: boolean;
};

function fingerprint(input: CheckoutInput) {
  const lines = mergeLines(input.lines).sort((a, b) => a.variantId.localeCompare(b.variantId));
  return sha256Hex(
    JSON.stringify({
      e: input.contact.email.toLowerCase(),
      l: lines,
      m: input.shippingMethod,
      a: [input.shipping.line1, input.shipping.postalCode, input.shipping.country].map((s) => s.trim().toLowerCase()),
    }),
  );
}

function isUniqueViolation(err: unknown, constraint: string) {
  const e = err as { code?: string; constraint_name?: string; cause?: { code?: string; constraint_name?: string } };
  const c = e?.code === "23505" ? e : e?.cause?.code === "23505" ? e.cause : null;
  return Boolean(c && (c.constraint_name === constraint || !c.constraint_name));
}

function replayResult(existing: Order, fp: string, idempotencyKey: string): CreateOrderResult {
  if (existing.requestFingerprint !== fp) {
    throw new ApiError(
      409,
      "idempotency_conflict",
      "This checkout was already submitted with different details. Refresh the page to start a new order.",
    );
  }
  const key = deriveTrackingKey(existing.id, idempotencyKey);
  const valid = safeEqualHex(hashTrackingKey(key), existing.accessTokenHash);
  return {
    orderId: existing.id,
    orderNumber: existing.orderNumber,
    trackingKey: valid ? formatTrackingKey(key) : null,
    status: existing.status,
    paymentProvider: existing.paymentProvider,
    totalCents: existing.totalCents,
    replayed: true,
  };
}

async function applyStockChange(
  tx: DbOrTx,
  variantId: string,
  change: { onHand: number; reserved: number },
  reason: InventoryReason,
  meta: { orderId?: string; adminUserId?: string; note?: string },
) {
  const [row] = await tx
    .update(inventory)
    .set({
      onHand: sql`${inventory.onHand} + ${change.onHand}`,
      reserved: sql`${inventory.reserved} + ${change.reserved}`,
    })
    .where(eq(inventory.variantId, variantId))
    .returning();
  if (!row) throw new ApiError(500, "inventory_missing", "Inventory record missing for variant.");
  await tx.insert(inventoryMovements).values({
    variantId,
    reason,
    onHandDelta: change.onHand,
    reservedDelta: change.reserved,
    onHandAfter: row.onHand,
    reservedAfter: row.reserved,
    orderId: meta.orderId,
    adminUserId: meta.adminUserId,
    note: meta.note,
  });
  return row;
}

export async function createOrder(
  input: CheckoutInput,
  opts: { idempotencyKey: string; provider: PaymentProvider },
  db = rootDb,
): Promise<CreateOrderResult> {
  const fp = fingerprint(input);
  const lines = mergeLines(input.lines);

  const run = () =>
    db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${opts.idempotencyKey}, 42))`);

      const existing = await tx.query.orders.findFirst({ where: eq(orders.idempotencyKey, opts.idempotencyKey) });
      if (existing) return replayResult(existing, fp, opts.idempotencyKey);

      const variantIds = lines.map((l) => l.variantId).sort();
      const locked = await tx
        .select()
        .from(inventory)
        .where(inArray(inventory.variantId, variantIds))
        .orderBy(asc(inventory.variantId))
        .for("update");
      const lockedMap = new Map(locked.map((r) => [r.variantId, r]));

      const quote = await quoteCart(lines, input.shippingMethod, tx, lockedMap);
      if (!quote.valid) {
        throw new ApiError(409, "cart_conflict", "Some items in your cart changed while you were checking out.", {
          lines: quote.lines
            .filter((l) => l.issue)
            .map((l) => ({
              variantId: l.variantId,
              issue: l.issue,
              message: describeIssue(l.issue!),
              maxQuantity: l.maxQuantity,
            })),
        });
      }

      const email = input.contact.email.toLowerCase();
      const phone = input.contact.phone || null;
      const [customer] = await tx
        .insert(customers)
        .values({ email, firstName: input.contact.firstName, lastName: input.contact.lastName, phone })
        .onConflictDoUpdate({
          target: customers.email,
          set: { firstName: input.contact.firstName, lastName: input.contact.lastName, phone, updatedAt: new Date() },
        })
        .returning({ id: customers.id });

      const orderId = randomUUID();
      const trackingKey = deriveTrackingKey(orderId, opts.idempotencyKey);
      const status: OrderStatus = opts.provider === "stripe" ? "pending_payment" : "confirmed";

      let orderNumber = generateOrderNumber();
      for (let i = 0; i < 5; i++) {
        const clash = await tx.query.orders.findFirst({
          where: eq(orders.orderNumber, orderNumber),
          columns: { id: true },
        });
        if (!clash) break;
        orderNumber = generateOrderNumber();
      }

      const method = quote.shippingOptions.find((o) => o.id === quote.shippingMethod)!;
      await tx.insert(orders).values({
        id: orderId,
        orderNumber,
        customerId: customer!.id,
        email,
        firstName: input.contact.firstName,
        lastName: input.contact.lastName,
        phone,
        status,
        paymentProvider: opts.provider,
        currency: quote.currency,
        subtotalCents: quote.subtotalCents,
        shippingCents: quote.shippingCents,
        taxCents: quote.taxCents,
        totalCents: quote.totalCents,
        shippingMethod: method.id,
        shippingMethodLabel: `${method.label} — ${method.description}`,
        shipName: `${input.contact.firstName} ${input.contact.lastName}`,
        shipLine1: input.shipping.line1,
        shipLine2: input.shipping.line2 || null,
        shipCity: input.shipping.city,
        shipRegion: input.shipping.region,
        shipPostalCode: input.shipping.postalCode.toUpperCase(),
        shipCountry: input.shipping.country,
        customerNote: input.note || null,
        accessTokenHash: hashTrackingKey(trackingKey),
        idempotencyKey: opts.idempotencyKey,
        requestFingerprint: fp,
        isDemo: true,
      });

      await tx.insert(orderItems).values(
        quote.lines.map((l) => ({
          orderId,
          productId: l.productId!,
          variantId: l.variantId,
          productName: l.productName,
          variantName: l.variantName,
          sku: l.sku,
          colorName: l.colorName,
          colorHex: l.colorHex,
          sizeLabel: l.sizeLabel,
          unitPriceCents: l.unitPriceCents,
          quantity: l.quantity,
          lineTotalCents: l.lineTotalCents,
        })),
      );

      for (const l of quote.lines) {
        if (opts.provider === "stripe") {
          await applyStockChange(tx, l.variantId, { onHand: 0, reserved: l.quantity }, "reservation", {
            orderId,
            note: `Reserved for ${orderNumber} pending payment`,
          });
        } else {
          await applyStockChange(tx, l.variantId, { onHand: -l.quantity, reserved: 0 }, "sale", {
            orderId,
            note: `Test order ${orderNumber}`,
          });
        }
      }

      await tx.insert(orderStatusEvents).values({
        orderId,
        fromStatus: null,
        toStatus: status,
        actor: "customer",
        note:
          opts.provider === "stripe"
            ? "Order created — awaiting Stripe test-mode payment."
            : "Test order placed — no payment requested or taken.",
      });

      await tx.insert(payments).values({
        orderId,
        provider: opts.provider,
        status: opts.provider === "stripe" ? "pending" : "not_charged",
        amountCents: quote.totalCents,
        currency: quote.currency,
      });

      return {
        orderId,
        orderNumber,
        trackingKey: formatTrackingKey(trackingKey),
        status,
        paymentProvider: opts.provider,
        totalCents: quote.totalCents,
        replayed: false,
      } satisfies CreateOrderResult;
    });

  try {
    return await run();
  } catch (err) {
    if (isUniqueViolation(err, "orders_idempotency_uq")) {
      const existing = await db.query.orders.findFirst({ where: eq(orders.idempotencyKey, opts.idempotencyKey) });
      if (existing) return replayResult(existing, fp, opts.idempotencyKey);
    }
    throw err;
  }
}

/* ───────────────────────── Status transitions ───────────────────────── */

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

/** Transitions an administrator may perform (payment confirmation is system-only). */
export function adminAllowedTransitions(from: OrderStatus): OrderStatus[] {
  return ORDER_TRANSITIONS[from].filter((s) => !(from === "pending_payment" && s === "confirmed"));
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  confirmed: "Confirmed",
  processing: "Preparing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/**
 * Moves an order to a new status inside a transaction, keeping inventory
 * consistent: cancelling restocks (or releases a reservation); confirming a
 * pending Stripe order converts its reservation into a sale.
 */
export async function transitionOrder(
  tx: DbOrTx,
  orderId: string,
  to: OrderStatus,
  meta: { actor: "system" | "admin" | "customer"; adminUserId?: string; note?: string },
) {
  const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
  if (!order) throw new ApiError(404, "not_found", "Order not found.");
  const from = order.status;
  if (from === to) return order;

  const allowed = meta.actor === "admin" ? adminAllowedTransitions(from) : ORDER_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new ApiError(
      409,
      "invalid_transition",
      `An order that is “${STATUS_LABELS[from]}” can't be moved to “${STATUS_LABELS[to]}”.`,
    );
  }

  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const sorted = [...items].sort((a, b) => a.variantId.localeCompare(b.variantId));
  if (sorted.length && (to === "cancelled" || (from === "pending_payment" && to === "confirmed"))) {
    await tx
      .select({ id: inventory.variantId })
      .from(inventory)
      .where(inArray(inventory.variantId, sorted.map((i) => i.variantId)))
      .orderBy(asc(inventory.variantId))
      .for("update");
  }

  for (const item of sorted) {
    const m = { orderId, adminUserId: meta.adminUserId, note: `${order.orderNumber}: ${STATUS_LABELS[from]} → ${STATUS_LABELS[to]}` };
    if (to === "cancelled") {
      if (from === "pending_payment") {
        await applyStockChange(tx, item.variantId, { onHand: 0, reserved: -item.quantity }, "reservation_release", m);
      } else {
        await applyStockChange(tx, item.variantId, { onHand: item.quantity, reserved: 0 }, "cancellation_restock", m);
      }
    } else if (from === "pending_payment" && to === "confirmed") {
      await applyStockChange(
        tx,
        item.variantId,
        { onHand: -item.quantity, reserved: -item.quantity },
        "reservation_commit",
        m,
      );
    }
  }

  const [updated] = await tx.update(orders).set({ status: to }).where(eq(orders.id, orderId)).returning();
  await tx.insert(orderStatusEvents).values({
    orderId,
    fromStatus: from,
    toStatus: to,
    actor: meta.actor,
    adminUserId: meta.adminUserId,
    note: meta.note || null,
  });
  return updated!;
}

/* ───────────────────────── Customer-facing views ───────────────────────── */

export type CustomerOrderView = {
  orderNumber: string;
  status: OrderStatus;
  statusLabel: string;
  createdAt: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  shipping: { name: string; line1: string; line2: string | null; city: string; region: string; postalCode: string; country: string };
  shippingMethodLabel: string;
  currency: string;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  paymentProvider: PaymentProvider;
  paymentStatus: string;
  isDemo: boolean;
  items: {
    productName: string;
    variantName: string;
    colorName: string;
    colorHex: string;
    sizeLabel: string;
    sku: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
  }[];
  timeline: { status: OrderStatus; label: string; at: string }[];
};

async function buildView(order: Order, db: DbOrTx): Promise<CustomerOrderView> {
  const [items, events, payment] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
    db
      .select()
      .from(orderStatusEvents)
      .where(eq(orderStatusEvents.orderId, order.id))
      .orderBy(asc(orderStatusEvents.createdAt)),
    db.query.payments.findFirst({ where: eq(payments.orderId, order.id), orderBy: desc(payments.createdAt) }),
  ]);
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    statusLabel: STATUS_LABELS[order.status],
    createdAt: order.createdAt.toISOString(),
    email: order.email,
    firstName: order.firstName,
    lastName: order.lastName,
    phone: order.phone,
    shipping: {
      name: order.shipName,
      line1: order.shipLine1,
      line2: order.shipLine2,
      city: order.shipCity,
      region: order.shipRegion,
      postalCode: order.shipPostalCode,
      country: order.shipCountry,
    },
    shippingMethodLabel: order.shippingMethodLabel,
    currency: order.currency,
    subtotalCents: order.subtotalCents,
    shippingCents: order.shippingCents,
    taxCents: order.taxCents,
    totalCents: order.totalCents,
    paymentProvider: order.paymentProvider,
    paymentStatus: payment?.status ?? "not_charged",
    isDemo: order.isDemo,
    items: items.map((i) => ({
      productName: i.productName,
      variantName: i.variantName,
      colorName: i.colorName,
      colorHex: i.colorHex,
      sizeLabel: i.sizeLabel,
      sku: i.sku,
      quantity: i.quantity,
      unitPriceCents: i.unitPriceCents,
      lineTotalCents: i.lineTotalCents,
    })),
    timeline: events.map((e) => ({ status: e.toStatus, label: STATUS_LABELS[e.toStatus], at: e.createdAt.toISOString() })),
  };
}

/**
 * Guest order access. Requires the order reference AND the secret tracking
 * key; both failure modes return null so references can't be enumerated.
 */
export async function getOrderForCustomer(
  orderNumber: string,
  trackingKey: string,
  db: DbOrTx = rootDb,
): Promise<CustomerOrderView | null> {
  const normalised = normaliseTrackingKey(trackingKey);
  const candidateHash = hashTrackingKey(normalised);
  const order = await db.query.orders.findFirst({ where: eq(orders.orderNumber, orderNumber.toUpperCase()) });
  const stored = order?.accessTokenHash ?? "0".repeat(64);
  const match = safeEqualHex(candidateHash, stored);
  if (!order || !match || normalised.length !== 20) return null;
  return buildView(order, db);
}

export async function getOrderViewById(orderId: string, db: DbOrTx = rootDb) {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  return order ? buildView(order, db) : null;
}

/** Releases stale Stripe reservations (sessions expire after 30 min; we allow 45). */
export async function expireStalePendingOrders(db = rootDb) {
  const stale = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.status, "pending_payment"), sql`${orders.createdAt} < now() - interval '45 minutes'`));
  for (const o of stale) {
    await db.transaction(async (tx) => {
      await transitionOrder(tx, o.id, "cancelled", { actor: "system", note: "Payment window expired; stock released." });
      await tx.update(payments).set({ status: "expired" }).where(and(eq(payments.orderId, o.id), eq(payments.status, "pending")));
    });
  }
  return stale.length;
}
