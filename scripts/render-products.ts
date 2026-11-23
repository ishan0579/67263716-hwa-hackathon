/**
 * Renders static product imagery from the real 3D model.
 *   1. Start the dev server (`npm run dev`).
 *   2. Run `npm run render:products` (RENDER_BASE_URL defaults to http://localhost:3000).
 * Writes transparent 1200×1200 PNGs to public/images/renders/.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { COLORWAYS } from "../src/content/product";

const BASE = process.env.RENDER_BASE_URL ?? "http://localhost:3000";
const OUT = path.join(process.cwd(), "public", "images", "renders");

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport: { width: 600, height: 600 }, deviceScaleFactor: 2 });
  const jobs = [
    ...COLORWAYS.map((c) => ({ file: `${c.key}.png`, query: `color=${c.key}&view=hero` })),
    { file: "exploded.png", query: `color=morning-walk&view=exploded` },
    { file: "top.png", query: `color=morning-walk&view=top` },
  ];
  for (const job of jobs) {
    await page.goto(`${BASE}/dev/render?${job.query}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.addStyleTag({ content: "html,body{background:transparent!important}nextjs-portal{display:none!important}" });
    await page.waitForSelector('[data-render-ready="true"]', { timeout: 120_000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, job.file), omitBackground: true, timeout: 120_000 });
    console.log(`✓ ${job.file}`);
  }
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
