import { expect, test } from "@playwright/test";

const PUBLIC_ROUTES = [
  "/",
  "/product/snifforbit-one",
  "/how-it-works",
  "/experience",
  "/customize",
  "/dog-match",
  "/cart",
  "/checkout",
  "/order/track",
  "/about",
  "/contact",
  "/faq",
  "/privacy",
  "/terms",
  "/shipping-returns",
];

const IGNORED_CONSOLE = [/THREE\.Clock/, /GPU stall/, /WebGL/i, /Download the React DevTools/];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("so-intro-seen", "1");
    } catch {}
  });
});

for (const route of PUBLIC_ROUTES) {
  test(`renders ${route} with one h1, a title and no runtime errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error" && !IGNORED_CONSOLE.some((r) => r.test(m.text()))) errors.push(m.text());
    });
    const res = await page.goto(route, { waitUntil: "load" });
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle(/SniffOrbit/);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("main#main")).toBeVisible();
    await page.waitForTimeout(800);
    expect(errors, errors.join("\n")).toEqual([]);
  });
}

test("unknown routes and products return branded 404s", async ({ page }) => {
  const a = await page.goto("/definitely-not-here");
  expect(a?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Lost the scent." })).toBeVisible();
  const b = await page.goto("/product/not-a-product");
  expect(b?.status()).toBe(404);
});

test("SEO endpoints: sitemap, robots, OG image and product structured data", async ({ page, request }) => {
  expect((await request.get("/sitemap.xml")).status()).toBe(200);
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
  const og = await request.get("/opengraph-image");
  expect(og.headers()["content-type"]).toContain("image/png");
  await page.goto("/product/snifforbit-one");
  const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(JSON.parse(ld!)["@type"]).toBe("Product");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/product\/snifforbit-one$/);
});

test("contact form and newsletter persist submissions", async ({ page }) => {
  await page.goto("/contact");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Please tell us your name")).toBeVisible();
  await page.getByLabel("Your name").fill("Playwright");
  await page.getByLabel("Email", { exact: true }).fill("pw@example.com");
  await page.getByLabel("Message").fill("Does the ratchet work in both directions?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("heading", { name: "Message received." })).toBeVisible();

  await page.getByRole("contentinfo").getByLabel("Email address").fill("e2e-news@example.com");
  await page.getByRole("contentinfo").getByRole("button", { name: "Subscribe" }).click();
  await expect(page.getByRole("contentinfo").getByText(/on the list/)).toBeVisible();
});

test("dog match quiz recommends and applies to the configurator", async ({ page }) => {
  await page.goto("/dog-match");
  await page.getByRole("button", { name: "Start Dog Match" }).click();
  for (const answer of [/^Large/, /^Adult/, /^A few simple ones/, /^Gentle explorer/, /^Very/, /^Nose first/]) {
    await page.getByRole("radio", { name: answer }).click();
  }
  await page.getByRole("button", { name: /None of these/ }).click();
  await expect(page.getByRole("heading", { level: 2, name: /Your match/ })).toContainText("Large");
  await expect(page.getByText(/Curious start, because/)).toBeVisible();
  await page.getByRole("link", { name: "Apply to configurator" }).click();
  await page.waitForURL(/customize\?size=large&level=2&from=match/);
  await expect(page.getByText("Your Dog Match:")).toBeVisible();
});

test("dog match flags power chewers as unsuitable", async ({ page }) => {
  await page.goto("/dog-match");
  await page.getByRole("button", { name: "Start Dog Match" }).click();
  for (const answer of [/^Medium/, /^Adult/, /^Never tried one/, /^Power chewer/, /^Moderately/, /^Paws first/]) {
    await page.getByRole("radio", { name: answer }).click();
  }
  await page.getByRole("button", { name: /None of these/ }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Not recommended" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Apply to configurator" })).toHaveCount(0);
});

test("interactive simulation has real state: load, open, retrieve, index, complete", async ({ page }) => {
  await page.goto("/experience");
  const sim = page.locator("section[aria-label='Puzzle simulation']");
  // Load only chamber 1
  for (const n of [2, 3, 4, 5, 6]) await sim.getByRole("button", { name: new RegExp(`^Chamber ${n},.*loaded`) }).click();
  await sim.getByRole("button", { name: "Start puzzle" }).click();
  const slider = sim.getByLabel("Push the shutter");
  await slider.fill("100");
  await expect(sim.getByRole("status")).toContainText("treat in the Open Cup");
  await sim.getByRole("button", { name: "Retrieve treat" }).click();
  await expect(sim.getByText("Every treat discovered!")).toBeVisible();
  await sim.getByRole("button", { name: "Replay this setup" }).click();
  await slider.fill("40");
  await sim.getByRole("button", { name: "Release shutter" }).click();
  await expect(sim.getByRole("status")).toContainText("only clicks after a full stroke");
});
