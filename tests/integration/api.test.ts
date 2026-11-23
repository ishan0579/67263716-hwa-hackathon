/**
 * Route-handler tests: exercise the real HTTP layer (validation, auth,
 * origin checks, status codes) against the test database.
 */
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/server/db";
import { contactSubmissions, newsletterSubscriptions, orders } from "@/server/db/schema";
import { POST as createOrderRoute } from "@/app/api/orders/route";
import { POST as lookupRoute } from "@/app/api/orders/lookup/route";
import { POST as quoteRoute } from "@/app/api/quote/route";
import { POST as contactRoute } from "@/app/api/contact/route";
import { POST as newsletterRoute } from "@/app/api/newsletter/route";
import { POST as loginRoute } from "@/app/api/admin/login/route";
import { POST as logoutRoute } from "@/app/api/admin/logout/route";
import { GET as adminOrdersRoute } from "@/app/api/admin/orders/route";
import { PATCH as adminOrderPatch } from "@/app/api/admin/orders/[id]/route";
import { GET as adminInventoryGet, POST as adminInventoryPost } from "@/app/api/admin/inventory/route";
import { POST as adminProductsPost } from "@/app/api/admin/products/route";
import { GET as productGet } from "@/app/api/products/[slug]/route";
import { GET as inventoryGet } from "@/app/api/inventory/route";
import { checkoutInput, jsonRequest, newKey, resetDatabase, TEST_ADMIN } from "../support/fixtures";

let ids: Record<string, string>;
const noCtx = {} as never;

beforeEach(async () => {
  ({ variantIds: ids } = await resetDatabase());
});

async function login() {
  const res = await loginRoute(jsonRequest("/api/admin/login", { email: TEST_ADMIN.email, password: TEST_ADMIN.password }), noCtx);
  expect(res.status).toBe(200);
  const setCookie = res.headers.get("set-cookie")!;
  expect(setCookie).toMatch(/HttpOnly/i);
  expect(setCookie).toMatch(/SameSite=lax/i);
  return setCookie.split(";")[0]!; // "so_admin=<token>"
}

describe("public catalog API", () => {
  it("returns the product with variants and hides exact stock above the threshold", async () => {
    const res = await productGet(new Request("http://localhost/api/products/snifforbit-one"), {
      params: Promise.resolve({ slug: "snifforbit-one" }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.product.variants).toHaveLength(8);
    const low = body.product.variants.find((v: { id: string }) => v.id === ids["fresh-trail:large"]);
    expect(low.stockStatus).toBe("low_stock");
    expect(low.lowStockCount).toBe(4);
    const plenty = body.product.variants.find((v: { id: string }) => v.id === ids["morning-walk:standard"]);
    expect(plenty.lowStockCount).toBeNull();
  });

  it("404s for unknown products and validates inventory queries", async () => {
    const res = await productGet(new Request("http://localhost/api/products/nope"), { params: Promise.resolve({ slug: "nope" }) });
    expect(res.status).toBe(404);
    const bad = await inventoryGet(new Request("http://localhost/api/inventory?variantIds=not-a-uuid"), noCtx);
    expect(bad.status).toBe(422);
  });

  it("quotes ignore any client-supplied price", async () => {
    const res = await quoteRoute(
      jsonRequest("/api/quote", { lines: [{ variantId: ids["morning-walk:standard"], quantity: 1, priceCents: 1 }] }),
      noCtx,
    );
    const { quote } = await res.json();
    expect(quote.subtotalCents).toBe(12900);
  });
});

describe("POST /api/orders", () => {
  it("requires an idempotency key", async () => {
    const res = await createOrderRoute(
      jsonRequest("/api/orders", checkoutInput([{ variantId: ids["morning-walk:standard"]!, quantity: 1 }])),
      noCtx,
    );
    expect(res.status).toBe(400);
  });

  it("returns field errors for invalid input", async () => {
    const input = checkoutInput([{ variantId: ids["morning-walk:standard"]!, quantity: 1 }]);
    input.contact.email = "not-an-email";
    input.shipping.postalCode = "ABC";
    const res = await createOrderRoute(
      jsonRequest("/api/orders", input, { headers: { "idempotency-key": newKey() } }),
      noCtx,
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.fieldErrors["contact.email"]).toBeTruthy();
    expect(body.error.fieldErrors["shipping.postalCode"]).toBeTruthy();
  });

  it("rejects cross-origin submissions", async () => {
    const res = await createOrderRoute(
      jsonRequest("/api/orders", checkoutInput([{ variantId: ids["morning-walk:standard"]!, quantity: 1 }]), {
        headers: { "idempotency-key": newKey(), origin: "https://evil.example" },
      }),
      noCtx,
    );
    expect(res.status).toBe(403);
  });

  it("creates an order, sets the confirmation cookie, and replays duplicates", async () => {
    const key = newKey();
    const input = checkoutInput([{ variantId: ids["deep-woods:standard"]!, quantity: 1 }]);
    const first = await createOrderRoute(jsonRequest("/api/orders", input, { headers: { "idempotency-key": key } }), noCtx);
    expect(first.status).toBe(201);
    const a = await first.json();
    expect(a.redirectUrl).toBe(`/order/success?ref=${a.orderNumber}`);
    expect(first.headers.get("set-cookie")).toContain("so_order=");

    const second = await createOrderRoute(jsonRequest("/api/orders", input, { headers: { "idempotency-key": key } }), noCtx);
    expect(second.status).toBe(200);
    const b = await second.json();
    expect(b.orderNumber).toBe(a.orderNumber);
    expect(b.replayed).toBe(true);
    expect(await getDb().select().from(orders)).toHaveLength(1);

    const lookup = await lookupRoute(
      jsonRequest("/api/orders/lookup", { orderNumber: a.orderNumber, trackingKey: a.trackingKey }),
      noCtx,
    );
    expect(lookup.status).toBe(200);
    const denied = await lookupRoute(
      jsonRequest("/api/orders/lookup", { orderNumber: a.orderNumber, trackingKey: "0000-0000-0000-0000-0000" }),
      noCtx,
    );
    expect(denied.status).toBe(404);
  });

  it("returns 409 with line details when stock is insufficient", async () => {
    const res = await createOrderRoute(
      jsonRequest("/api/orders", checkoutInput([{ variantId: ids["sunset-fetch:large"]!, quantity: 1 }]), {
        headers: { "idempotency-key": newKey() },
      }),
      noCtx,
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.details.lines[0].issue).toBe("sold_out");
  });
});

describe("contact & newsletter", () => {
  it("stores contact submissions and rejects honeypot spam", async () => {
    const res = await contactRoute(
      jsonRequest("/api/contact", { name: "Grace", email: "grace@example.com", topic: "product", message: "How does the ratchet reset?" }),
      noCtx,
    );
    expect(res.status).toBe(201);
    expect(await getDb().select().from(contactSubmissions)).toHaveLength(1);

    const spam = await contactRoute(
      jsonRequest("/api/contact", { name: "Bot", email: "b@example.com", topic: "other", message: "buy cheap things now", company: "x" }),
      noCtx,
    );
    expect(spam.status).toBe(422);
  });

  it("subscribes idempotently", async () => {
    const a = await newsletterRoute(jsonRequest("/api/newsletter", { email: "Fan@Example.com" }), noCtx);
    const b = await newsletterRoute(jsonRequest("/api/newsletter", { email: "fan@example.com" }), noCtx);
    expect((await a.json()).alreadySubscribed).toBe(false);
    expect((await b.json()).alreadySubscribed).toBe(true);
    const rows = await getDb().select().from(newsletterSubscriptions).where(eq(newsletterSubscriptions.email, "fan@example.com"));
    expect(rows).toHaveLength(1);
  });
});

describe("admin authentication & authorisation", () => {
  it("blocks every admin endpoint without a valid session", async () => {
    const results = await Promise.all([
      adminOrdersRoute(new Request("http://localhost/api/admin/orders"), noCtx),
      adminInventoryGet(new Request("http://localhost/api/admin/inventory"), noCtx),
      adminInventoryPost(jsonRequest("/api/admin/inventory", { variantId: ids["morning-walk:standard"], mode: "set", value: 999, reason: "restock" }), noCtx),
      adminProductsPost(jsonRequest("/api/admin/products", { name: "Fake", slug: "fake" }), noCtx),
      adminOrdersRoute(new Request("http://localhost/api/admin/orders", { headers: { cookie: "so_admin=forged-token-value-that-is-long-enough-123" } }), noCtx),
    ]);
    for (const r of results) expect(r.status).toBe(401);
  });

  it("rejects wrong passwords with a generic message", async () => {
    const res = await loginRoute(jsonRequest("/api/admin/login", { email: TEST_ADMIN.email, password: "wrong-password" }), noCtx);
    expect(res.status).toBe(401);
    const unknown = await loginRoute(jsonRequest("/api/admin/login", { email: "nobody@example.com", password: "wrong-password" }), noCtx);
    expect(unknown.status).toBe(401);
    expect((await res.json()).error.message).toBe((await unknown.json()).error.message);
  });

  it("allows an authenticated admin to manage orders and stock, then logs out", async () => {
    const cookie = await login();
    const list = await adminOrdersRoute(new Request("http://localhost/api/admin/orders", { headers: { cookie } }), noCtx);
    expect(list.status).toBe(200);

    const adj = await adminInventoryPost(
      jsonRequest(
        "/api/admin/inventory",
        { variantId: ids["sunset-fetch:large"], mode: "delta", value: 12, reason: "restock", note: "Pallet arrived" },
        { headers: { cookie } },
      ),
      noCtx,
    );
    expect(adj.status).toBe(200);
    expect((await adj.json()).inventory.onHand).toBe(12);

    // place an order then move it through statuses via the API
    const orderRes = await createOrderRoute(
      jsonRequest("/api/orders", checkoutInput([{ variantId: ids["morning-walk:standard"]!, quantity: 1 }]), {
        headers: { "idempotency-key": newKey() },
      }),
      noCtx,
    );
    const { orderNumber } = await orderRes.json();
    const [order] = await getDb().select().from(orders).where(eq(orders.orderNumber, orderNumber));
    const patch = (status: string) =>
      adminOrderPatch(jsonRequest(`/api/admin/orders/${order!.id}`, { status }, { method: "PATCH", headers: { cookie } }), {
        params: Promise.resolve({ id: order!.id }),
      });
    expect((await patch("processing")).status).toBe(200);
    expect((await patch("delivered")).status).toBe(409); // must ship first
    expect((await patch("shipped")).status).toBe(200);

    const out = await logoutRoute(jsonRequest("/api/admin/logout", {}, { headers: { cookie } }), noCtx);
    expect(out.status).toBe(200);
    const after = await adminOrdersRoute(new Request("http://localhost/api/admin/orders", { headers: { cookie } }), noCtx);
    expect(after.status).toBe(401);
  });
});
