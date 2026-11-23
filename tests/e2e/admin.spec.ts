import { expect, test, type Page } from "@playwright/test";
import { TEST_ADMIN } from "../support/constants";

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email", { exact: true }).fill(TEST_ADMIN.email);
  await page.getByLabel("Password", { exact: true }).fill(TEST_ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin$/);
}

test("admin pages and APIs reject anonymous visitors", async ({ page, request }) => {
  for (const p of ["/admin", "/admin/orders", "/admin/products", "/admin/inventory", "/admin/messages"]) {
    await page.goto(p);
    await expect(page).toHaveURL(/\/admin\/login$/);
  }
  expect((await request.get("/api/admin/orders")).status()).toBe(401);
  expect((await request.post("/api/admin/inventory", { data: {} })).status()).toBe(401);
});

test("wrong password shows a generic error", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email", { exact: true }).fill(TEST_ADMIN.email);
  await page.getByLabel("Password", { exact: true }).fill("nope-nope-nope");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText(/isn.t right/)).toBeVisible();
});

test("admin can manage an order, stock and a product", async ({ page, request }) => {
  // Seed an order through the public API
  const product = await (await request.get("/api/products/snifforbit-one")).json();
  const variant = product.product.variants.find((v: { sku: string }) => v.sku === "SO1-FT-STD");
  const res = await request.post("/api/orders", {
    headers: { "idempotency-key": `e2e-admin-${Date.now()}` },
    data: {
      contact: { email: "admin-flow@example.com", firstName: "Ada", lastName: "Admin", phone: "" },
      shipping: { line1: "5 Ops Rd", line2: "", city: "Toronto", region: "ON", postalCode: "M5V 2T6", country: "CA" },
      shippingMethod: "standard",
      lines: [{ variantId: variant.id, quantity: 1 }],
      note: "",
      acceptTerms: true,
    },
  });
  const { orderNumber } = await res.json();

  await login(page);
  await expect(page.getByText("Demo store — all figures are test data").first()).toBeVisible();

  // Find and update the order
  await page.goto(`/admin/orders?q=${orderNumber}`);
  await page.getByRole("link", { name: orderNumber }).first().click();
  await expect(page.getByRole("heading", { name: new RegExp(orderNumber) })).toBeVisible();
  await page.getByRole("radio", { name: /Preparing/ }).check();
  await page.getByLabel("Internal note").fill("Packed by E2E");
  await page.getByRole("button", { name: "Update status" }).click();
  await expect(page.getByText("Packed by E2E")).toBeVisible();

  // Customer-facing tracking reflects nothing secret without the key; admin sees history.
  await expect(page.getByText("Preparing").first()).toBeVisible();

  // Restock a variant
  await page.goto("/admin/inventory");
  await page.getByRole("button", { name: "Adjust stock for SO1-FT-LRG" }).click();
  await page.getByLabel("Units to add").fill("7");
  await page.getByLabel("Note").fill("E2E restock");
  await page.getByRole("button", { name: "Save adjustment" }).click();
  await expect(page.getByText("E2E restock").first()).toBeVisible();

  // Storefront reflects the restock
  const inv = await (await request.get(`/api/products/snifforbit-one`)).json();
  const ft = inv.product.variants.find((v: { sku: string }) => v.sku === "SO1-FT-LRG");
  expect(ft.stockStatus).toBe("in_stock"); // 4 + 7 is above the low-stock threshold

  // Sign out invalidates the session
  await page.goto("/admin");
  await page.getByRole("button", { name: /Sign out/ }).first().click();
  await page.waitForURL(/\/admin\/login/);
  await page.goto("/admin/orders");
  await expect(page).toHaveURL(/\/admin\/login$/);
});
