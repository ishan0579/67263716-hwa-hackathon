import { expect, test } from "@playwright/test";

const PAGES = ["/", "/product/snifforbit-one", "/customize", "/checkout", "/how-it-works", "/experience", "/dog-match", "/faq", "/order/track"];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("so-intro-seen", "1"));
});

for (const p of PAGES) {
  test(`no horizontal overflow on ${p}`, async ({ page }) => {
    await page.goto(p);
    await page.waitForTimeout(600);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("mobile menu opens, navigates and closes", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("dialog", { name: "Site menu" });
  await expect(menu).toBeVisible();
  await menu.getByRole("link", { name: /Dog Match/ }).click();
  await page.waitForURL(/\/dog-match$/);
  await expect(menu).toBeHidden();
});

test("mobile add to cart and checkout entry", async ({ page }) => {
  await page.goto("/customize");
  await page.getByRole("button", { name: /Add to cart/ }).click();
  await expect(page.getByRole("dialog", { name: "Shopping cart" })).toBeVisible();
  await page.getByRole("link", { name: /Checkout ·/ }).click();
  await expect(page.getByRole("heading", { name: "Review your cart" })).toBeVisible();
});
