import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { seedCatalog, upsertAdmin } from "@/server/seed";
import type { CheckoutInput } from "@/lib/validation/checkout";

import { TEST_ADMIN } from "./constants";
export { TEST_ADMIN };

/** Wipes all tables and re-seeds the demo catalog plus a test admin. */
export async function resetDatabase() {
  const db = getDb();
  await db.execute(sql`
    TRUNCATE TABLE inventory_movements, order_status_events, payments, order_items, orders, customers,
      inventory, product_images, product_variants, products, admin_sessions, admin_users,
      contact_submissions, newsletter_subscriptions, site_config, rate_limits RESTART IDENTITY CASCADE
  `);
  const seeded = await seedCatalog(db);
  const admin = await upsertAdmin(db, TEST_ADMIN.email, TEST_ADMIN.password, TEST_ADMIN.name);
  return { ...seeded, adminId: admin.id };
}

export function checkoutInput(lines: CheckoutInput["lines"], overrides: Partial<CheckoutInput> = {}): CheckoutInput {
  return {
    contact: { email: "Ada@Example.com", firstName: "Ada", lastName: "Lovelace", phone: "" },
    shipping: {
      line1: "12 Orbit Lane",
      line2: "",
      city: "Portland",
      region: "OR",
      postalCode: "97201",
      country: "US",
    },
    shippingMethod: "standard",
    lines,
    note: "",
    acceptTerms: true,
    ...overrides,
  };
}

export const newKey = () => randomUUID().replace(/-/g, "");

export function jsonRequest(url: string, body: unknown, init: { method?: string; headers?: Record<string, string> } = {}) {
  return new Request(`http://localhost:3000${url}`, {
    method: init.method ?? "POST",
    headers: { "content-type": "application/json", host: "localhost:3000", ...init.headers },
    body: JSON.stringify(body),
  });
}
