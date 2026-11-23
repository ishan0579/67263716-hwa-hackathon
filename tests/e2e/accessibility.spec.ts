import { expect, test } from "@playwright/test";

test("skip link moves focus to main content", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("so-intro-seen", "1"));
  await page.goto("/faq");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

test("FAQ accordion works with the keyboard", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("so-intro-seen", "1"));
  await page.goto("/faq");
  const q = page.getByRole("button", { name: "How does SniffOrbit ONE work?" });
  await q.focus();
  await page.keyboard.press("Enter");
  await expect(q).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("region", { name: "How does SniffOrbit ONE work?" })).toBeVisible();
});

test("intro is skipped entirely with reduced motion", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Skip intro" })).toHaveCount(0);
  await expect(page.locator("#so-intro")).toBeHidden();
  await ctx.close();
});

test("intro plays once per session and can be skipped", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Skip intro" }).click();
  await expect(page.getByRole("button", { name: "Skip intro" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "Skip intro" })).toHaveCount(0);
});

test("cart drawer is a modal dialog that traps and restores focus", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("so-intro-seen", "1"));
  await page.goto("/about");
  const trigger = page.getByRole("button", { name: /Open cart/ });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Shopping cart" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Close cart" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("3D viewer controls are keyboard operable with live announcements", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("so-intro-seen", "1"));
  await page.goto("/customize");
  const explode = page.getByRole("button", { name: "Exploded" });
  await explode.focus();
  await page.keyboard.press("Enter");
  await expect(explode).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /Chamber 3: Pillar Maze/ }).click();
  await expect(page.getByText("Chamber 03 · Curious")).toBeVisible();
});
