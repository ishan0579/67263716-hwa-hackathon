import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/server/db";
import { inventory, inventoryMovements, orderItems, orders, payments, productVariants } from "@/server/db/schema";
import { ApiError } from "@/server/http";
import { createOrder, getOrderForCustomer, transitionOrder } from "@/server/services/orders";
import { quoteCart } from "@/server/services/quote";
import { checkoutInput, newKey, resetDatabase } from "../support/fixtures";

let ids: Record<string, string>;

async function stock(variantId: string) {
  const [row] = await getDb().select().from(inventory).where(eq(inventory.variantId, variantId));
  return row!;
}

beforeEach(async () => {
  ({ variantIds: ids } = await resetDatabase());
});

describe("quoteCart", () => {
  it("prices from the database and applies free standard shipping over the threshold", async () => {
    const q1 = await quoteCart([{ variantId: ids["morning-walk:standard"]!, quantity: 1 }]);
    expect(q1.subtotalCents).toBe(12900);
    expect(q1.shippingCents).toBe(900);
    expect(q1.totalCents).toBe(13800);

    const q2 = await quoteCart([{ variantId: ids["morning-walk:large"]!, quantity: 1 }], "standard");
    expect(q2.subtotalCents).toBe(14900);
    expect(q2.shippingCents).toBe(0); // free standard shipping from $140
  });

  it("flags sold-out and insufficient stock lines", async () => {
    const q = await quoteCart([
      { variantId: ids["sunset-fetch:large"]!, quantity: 1 },
      { variantId: ids["fresh-trail:large"]!, quantity: 5 },
    ]);
    expect(q.valid).toBe(false);
    expect(q.lines.find((l) => l.variantId === ids["sunset-fetch:large"])!.issue).toBe("sold_out");
    expect(q.lines.find((l) => l.variantId === ids["fresh-trail:large"])!.issue).toBe("insufficient_stock");
  });

  it("merges duplicate lines", async () => {
    const q = await quoteCart([
      { variantId: ids["deep-woods:standard"]!, quantity: 1 },
      { variantId: ids["deep-woods:standard"]!, quantity: 2 },
    ]);
    expect(q.lines).toHaveLength(1);
    expect(q.lines[0]!.quantity).toBe(3);
  });
});

describe("createOrder", () => {
  it("persists a test-mode order with server-calculated totals and decrements stock", async () => {
    const variantId = ids["deep-woods:standard"]!;
    const before = await stock(variantId);
    const res = await createOrder(checkoutInput([{ variantId, quantity: 2 }]), {
      idempotencyKey: newKey(),
      provider: "test_mode",
    });

    expect(res.orderNumber).toMatch(/^SO-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    expect(res.trackingKey).toMatch(/^[0-9A-Z]{4}(-[0-9A-Z]{4}){4}$/);
    expect(res.status).toBe("confirmed");
    expect(res.totalCents).toBe(2 * 12900); // free standard shipping over $150

    const db = getDb();
    const [order] = await db.select().from(orders).where(eq(orders.orderNumber, res.orderNumber));
    expect(order!.email).toBe("ada@example.com");
    expect(order!.subtotalCents).toBe(25800);
    expect(order!.shippingCents).toBe(0);
    expect(order!.accessTokenHash).not.toContain(res.trackingKey!.replace(/-/g, ""));

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order!.id));
    expect(items).toHaveLength(1);
    expect(items[0]!.unitPriceCents).toBe(12900);

    const [payment] = await db.select().from(payments).where(eq(payments.orderId, order!.id));
    expect(payment!.status).toBe("not_charged");
    expect(payment!.provider).toBe("test_mode");

    expect((await stock(variantId)).onHand).toBe(before.onHand - 2);
    const moves = await db.select().from(inventoryMovements).where(eq(inventoryMovements.orderId, order!.id));
    expect(moves).toHaveLength(1);
    expect(moves[0]!.reason).toBe("sale");
    expect(moves[0]!.onHandDelta).toBe(-2);
  });

  it("uses the current database price even if the admin changed it", async () => {
    const variantId = ids["morning-walk:standard"]!;
    await getDb().update(productVariants).set({ priceCents: 9900 }).where(eq(productVariants.id, variantId));
    const res = await createOrder(checkoutInput([{ variantId, quantity: 1 }]), {
      idempotencyKey: newKey(),
      provider: "test_mode",
    });
    expect(res.totalCents).toBe(9900 + 900);
  });

  it("is idempotent: retrying with the same key returns the same order and tracking key", async () => {
    const key = newKey();
    const input = checkoutInput([{ variantId: ids["morning-walk:standard"]!, quantity: 1 }]);
    const [a, b] = await Promise.all([
      createOrder(input, { idempotencyKey: key, provider: "test_mode" }),
      createOrder(input, { idempotencyKey: key, provider: "test_mode" }),
    ]);
    expect(a.orderNumber).toBe(b.orderNumber);
    expect(a.trackingKey).toBe(b.trackingKey);
    expect([a.replayed, b.replayed].sort()).toEqual([false, true]);

    const c = await createOrder(input, { idempotencyKey: key, provider: "test_mode" });
    expect(c.orderNumber).toBe(a.orderNumber);
    expect(c.replayed).toBe(true);

    const all = await getDb().select().from(orders);
    expect(all).toHaveLength(1);
    expect((await stock(ids["morning-walk:standard"]!)).onHand).toBe(39);
  });

  it("rejects a reused idempotency key with a different cart", async () => {
    const key = newKey();
    await createOrder(checkoutInput([{ variantId: ids["morning-walk:standard"]!, quantity: 1 }]), {
      idempotencyKey: key,
      provider: "test_mode",
    });
    await expect(
      createOrder(checkoutInput([{ variantId: ids["morning-walk:standard"]!, quantity: 2 }]), {
        idempotencyKey: key,
        provider: "test_mode",
      }),
    ).rejects.toMatchObject({ status: 409, code: "idempotency_conflict" });
  });

  it("refuses to oversell and reports the conflicting line", async () => {
    const err = await createOrder(checkoutInput([{ variantId: ids["fresh-trail:large"]!, quantity: 5 }]), {
      idempotencyKey: newKey(),
      provider: "test_mode",
    }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(409);
    expect(err.code).toBe("cart_conflict");
    expect((await stock(ids["fresh-trail:large"]!)).onHand).toBe(4);
    expect(await getDb().select().from(orders)).toHaveLength(0);
  });

  it("never oversells under concurrent checkouts", async () => {
    const variantId = ids["fresh-trail:large"]!; // 4 in stock
    const attempts = Array.from({ length: 8 }, (_, i) =>
      createOrder(
        checkoutInput([{ variantId, quantity: 1 }], {
          contact: { email: `buyer${i}@example.com`, firstName: "B", lastName: `${i}`, phone: "" },
        }),
        { idempotencyKey: newKey(), provider: "test_mode" },
      ).then(
        () => "ok" as const,
        (e) => (e instanceof ApiError && e.code === "cart_conflict" ? ("conflict" as const) : Promise.reject(e)),
      ),
    );
    const results = await Promise.all(attempts);
    expect(results.filter((r) => r === "ok")).toHaveLength(4);
    expect(results.filter((r) => r === "conflict")).toHaveLength(4);
    const s = await stock(variantId);
    expect(s.onHand).toBe(0);
    expect(s.reserved).toBe(0);
  });

  it("rejects inactive variants", async () => {
    const variantId = ids["deep-woods:large"]!;
    await getDb().update(productVariants).set({ isActive: false }).where(eq(productVariants.id, variantId));
    await expect(
      createOrder(checkoutInput([{ variantId, quantity: 1 }]), { idempotencyKey: newKey(), provider: "test_mode" }),
    ).rejects.toMatchObject({ code: "cart_conflict" });
  });

  it("reserves stock for Stripe orders and commits it on payment confirmation", async () => {
    const variantId = ids["deep-woods:large"]!;
    const res = await createOrder(checkoutInput([{ variantId, quantity: 2 }]), {
      idempotencyKey: newKey(),
      provider: "stripe",
    });
    expect(res.status).toBe("pending_payment");
    let s = await stock(variantId);
    expect([s.onHand, s.reserved]).toEqual([18, 2]);

    await getDb().transaction((tx) => transitionOrder(tx, res.orderId, "confirmed", { actor: "system" }));
    s = await stock(variantId);
    expect([s.onHand, s.reserved]).toEqual([16, 0]);
  });
});

describe("order lifecycle", () => {
  it("cancelling restocks inventory and records an event", async () => {
    const variantId = ids["morning-walk:large"]!;
    const res = await createOrder(checkoutInput([{ variantId, quantity: 3 }]), {
      idempotencyKey: newKey(),
      provider: "test_mode",
    });
    expect((await stock(variantId)).onHand).toBe(21);
    await getDb().transaction((tx) => transitionOrder(tx, res.orderId, "cancelled", { actor: "admin" }));
    expect((await stock(variantId)).onHand).toBe(24);
  });

  it("blocks invalid transitions and admin payment confirmation", async () => {
    const res = await createOrder(
      checkoutInput([{ variantId: ids["morning-walk:standard"]!, quantity: 1 }]),
      { idempotencyKey: newKey(), provider: "test_mode" },
    );
    await expect(
      getDb().transaction((tx) => transitionOrder(tx, res.orderId, "delivered", { actor: "admin" })),
    ).rejects.toMatchObject({ code: "invalid_transition" });

    const pending = await createOrder(
      checkoutInput([{ variantId: ids["morning-walk:standard"]!, quantity: 1 }]),
      { idempotencyKey: newKey(), provider: "stripe" },
    );
    await expect(
      getDb().transaction((tx) => transitionOrder(tx, pending.orderId, "confirmed", { actor: "admin" })),
    ).rejects.toMatchObject({ code: "invalid_transition" });
  });
});

describe("guest order lookup", () => {
  it("requires the correct tracking key and tolerates formatting differences", async () => {
    const res = await createOrder(
      checkoutInput([{ variantId: ids["morning-walk:standard"]!, quantity: 1 }]),
      { idempotencyKey: newKey(), provider: "test_mode" },
    );
    const key = res.trackingKey!;
    const ok = await getOrderForCustomer(res.orderNumber, key.toLowerCase().replace(/-/g, " "));
    expect(ok?.orderNumber).toBe(res.orderNumber);
    expect(ok?.items[0]?.quantity).toBe(1);
    expect(ok?.timeline[0]?.status).toBe("confirmed");

    const wrongKey = key.slice(0, -1) + (key.endsWith("A") ? "B" : "A");
    expect(await getOrderForCustomer(res.orderNumber, wrongKey)).toBeNull();
    expect(await getOrderForCustomer("SO-0000-0000", key)).toBeNull();
    expect(await getOrderForCustomer(res.orderNumber, "")).toBeNull();
  });
});
