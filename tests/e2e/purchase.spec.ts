import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("so-intro-seen", "1");
    } catch {}
  });
});

test("complete purchase journey: configure → cart → checkout → confirmation → tracking", async ({ page }) => {
  // Configure on /customize
  await page.goto("/customize");
  await expect(page.getByRole("heading", { level: 1, name: /Customize SniffOrbit ONE/ })).toBeVisible();
  await page.getByRole("radio", { name: /Deep Woods/ }).click();
  await page.getByRole("radiogroup", { name: "Size" }).getByRole("radio", { name: /large/i }).click();
  await expect(page.getByText("$149").first()).toBeVisible();
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.getByRole("button", { name: /Add to cart/ }).click();

  // Drawer opens with the line; shows success toast
  const drawer = page.getByRole("dialog", { name: "Shopping cart" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText("Deep Woods · Large · Ø 34 cm")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Added to cart" })).toBeVisible();

  // Cart persists across a reload
  await page.goto("/cart");
  await page.reload();
  await expect(page.getByText("Deep Woods · Large · Ø 34 cm")).toBeVisible();
  await expect(page.getByRole("group", { name: /Quantity for Deep Woods/ }).locator("output")).toHaveText("2");

  // Checkout
  await page.getByRole("link", { name: "Continue to checkout" }).click();
  await expect(page.getByRole("heading", { name: "Review your cart" })).toBeVisible();
  await page.getByRole("button", { name: /Continue to contact/ }).click();

  // Validation errors appear
  await page.getByRole("button", { name: /Continue to shipping/ }).click();
  await expect(page.getByText("Enter a valid email address")).toBeVisible();

  await page.getByLabel("Email", { exact: true }).fill("e2e.buyer@example.com");
  await page.getByLabel("First name").fill("Edda");
  await page.getByLabel("Last name").fill("Tester");
  await page.getByRole("button", { name: /Continue to shipping/ }).click();

  await page.getByLabel("Street address").fill("1 Test Orbit Way");
  await page.getByLabel("City").fill("Seattle");
  await page.getByLabel("State").fill("WA");
  await page.getByLabel("ZIP code").fill("9810");
  await page.getByRole("button", { name: /Continue to delivery/ }).click();
  await expect(page.getByText("Enter a 5-digit ZIP code")).toBeVisible();
  await page.getByLabel("ZIP code").fill("98101");
  await page.getByRole("button", { name: /Continue to delivery/ }).click();

  await page.getByText("Express", { exact: true }).click();
  await page.getByRole("button", { name: /Continue to review/ }).click();

  // Totals: 2 × $149 + $24 express = $322.00
  await expect(page.getByRole("complementary", { name: "Order summary" }).getByText("$322.00")).toBeVisible();
  const place = page.getByRole("button", { name: /Place test order/ });
  await place.click();
  await expect(page.getByText("Please confirm you understand this is a test order")).toBeVisible();
  await page.getByLabel(/I understand this is a demonstration store/).check();
  await place.click();

  // Confirmation shows the persisted order
  await page.waitForURL(/\/order\/success\?ref=SO-/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Discovery");
  const ref = new URL(page.url()).searchParams.get("ref")!;
  await expect(page.getByText(ref).first()).toBeVisible();
  const key = (await page.locator("p.font-mono").first().textContent())!.trim();
  expect(key).toMatch(/^[0-9A-Z]{4}(-[0-9A-Z]{4}){4}$/);
  await expect(page.getByText("Test order — no payment requested or taken")).toBeVisible();
  await expect(page.getByText("$322.00").first()).toBeVisible();

  // Cart was cleared
  await page.goto("/cart");
  await expect(page.getByText(/Nothing to sniff out here/)).toBeVisible();

  // A bare reference grants nothing in another browser context
  const other = await page.context().browser()!.newContext();
  const stranger = await other.newPage();
  await stranger.goto(new URL(`/order/success?ref=${ref}`, page.url()).toString());
  await expect(stranger.getByRole("heading", { name: /can.t show that order/ })).toBeVisible();
  await other.close();

  // Tracking with wrong key fails, correct key succeeds
  await page.goto("/order/track");
  await page.getByLabel("Order reference").fill(ref);
  await page.getByLabel("Tracking key").fill("AAAA-AAAA-AAAA-AAAA-AAAA");
  await page.getByRole("button", { name: "Find my order" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "couldn't find" })).toBeVisible();
  await page.getByLabel("Tracking key").fill(key.toLowerCase());
  await page.getByRole("button", { name: "Find my order" }).click();
  await expect(page.getByText(`Order ${ref}`)).toBeVisible();
  await expect(page.getByText("Confirmed").first()).toBeVisible();
});

test("sold-out variants cannot be added", async ({ page }) => {
  await page.goto("/customize?color=sunset-fetch&size=large");
  await expect(page.getByRole("button", { name: "Sold out" })).toBeDisabled();
});

test("double-clicking place order creates exactly one order", async ({ request }) => {
  const product = await (await request.get("/api/products/snifforbit-one")).json();
  const variant = product.product.variants.find((v: { sku: string }) => v.sku === "SO1-MW-STD");
  const body = {
    contact: { email: "double@example.com", firstName: "Dee", lastName: "Bounce", phone: "" },
    shipping: { line1: "2 Click St", line2: "", city: "Austin", region: "TX", postalCode: "73301", country: "US" },
    shippingMethod: "standard",
    lines: [{ variantId: variant.id, quantity: 1 }],
    note: "",
    acceptTerms: true,
  };
  const headers = { "idempotency-key": "e2e-double-click-key-0001", "content-type": "application/json" };
  const [a, b] = await Promise.all([request.post("/api/orders", { data: body, headers }), request.post("/api/orders", { data: body, headers })]);
  const [ja, jb] = [await a.json(), await b.json()];
  expect(ja.orderNumber).toBe(jb.orderNumber);
  expect([a.status(), b.status()].sort()).toEqual([200, 201]);
});
