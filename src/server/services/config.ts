import { eq } from "drizzle-orm";
import { z } from "zod";
import type { DbOrTx } from "../db";
import { db as rootDb } from "../db";
import { siteConfig } from "../db/schema";

export const shippingConfigSchema = z.object({
  currency: z.string().length(3),
  countries: z.array(z.string().length(2)),
  methods: z.array(
    z.object({
      id: z.enum(["standard", "express"]),
      label: z.string(),
      description: z.string(),
      priceCents: z.number().int().min(0),
      freeOverCents: z.number().int().min(0).nullable(),
    }),
  ),
});

export type ShippingConfig = z.infer<typeof shippingConfigSchema>;

export const DEFAULT_SHIPPING: ShippingConfig = {
  currency: "USD",
  countries: ["US", "CA"],
  methods: [
    {
      id: "standard",
      label: "Standard",
      description: "5–8 business days (estimate)",
      priceCents: 900,
      freeOverCents: 14000,
    },
    {
      id: "express",
      label: "Express",
      description: "2–3 business days (estimate)",
      priceCents: 2400,
      freeOverCents: null,
    },
  ],
};

export async function getShippingConfig(db: DbOrTx = rootDb): Promise<ShippingConfig> {
  const row = await db.query.siteConfig.findFirst({ where: eq(siteConfig.key, "shipping") });
  const parsed = shippingConfigSchema.safeParse(row?.value);
  return parsed.success ? parsed.data : DEFAULT_SHIPPING;
}

export function shippingOptionsFor(subtotalCents: number, cfg: ShippingConfig) {
  return cfg.methods.map((m) => {
    const free = m.freeOverCents !== null && subtotalCents >= m.freeOverCents;
    return {
      id: m.id,
      label: m.label,
      description: m.description,
      priceCents: free ? 0 : m.priceCents,
      basePriceCents: m.priceCents,
      freeOverCents: m.freeOverCents,
    };
  });
}

export function isStripeEnabled() {
  const key = process.env.STRIPE_SECRET_KEY;
  return Boolean(key && key.startsWith("sk_test_"));
}
