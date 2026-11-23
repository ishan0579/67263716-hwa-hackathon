import { z } from "zod";

export const ORDER_STATUSES = [
  "pending_payment",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export const orderStatusSchema = z.enum(ORDER_STATUSES);

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use a 6-digit hex colour like #FF794B");
const slug = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes only");

export const specRowSchema = z.object({
  group: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(300),
  provisional: z.boolean().optional(),
});

export const productInputSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(160),
  slug,
  tagline: z.string().trim().max(240).default(""),
  description: z.string().trim().max(5000).default(""),
  conceptNotice: z.string().trim().max(1000).default(""),
  highlights: z.array(z.string().trim().min(1).max(200)).max(12).default([]),
  specifications: z.array(specRowSchema).max(40).default([]),
  isActive: z.boolean().default(false),
});

export const productUpdateSchema = productInputSchema.partial();

/** Prices are entered in dollars in the UI and converted to cents before sending. */
export const variantInputSchema = z.object({
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .min(3)
    .max(64)
    .regex(/^[A-Z0-9-]+$/, "Letters, numbers and dashes only"),
  name: z.string().trim().min(2).max(160),
  colorKey: slug,
  colorName: z.string().trim().min(2).max(80),
  colorHex: hex,
  accentHex: hex,
  size: z.string().trim().min(2).max(20),
  sizeLabel: z.string().trim().min(2).max(80),
  priceCents: z.number().int().min(0, "Price can't be negative").max(1_000_000),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(999).default(0),
  initialStock: z.number().int().min(0).max(100_000).default(0),
  lowStockThreshold: z.number().int().min(0).max(10_000).default(5),
});

export const variantUpdateSchema = variantInputSchema
  .omit({ initialStock: true, lowStockThreshold: true })
  .partial();

export const inventoryAdjustmentSchema = z
  .object({
    variantId: z.uuid(),
    mode: z.enum(["delta", "set"]),
    value: z.number().int().min(-100_000).max(100_000),
    reason: z.enum(["restock", "adjustment"]),
    note: z.string().trim().max(500).optional().or(z.literal("")),
    lowStockThreshold: z.number().int().min(0).max(10_000).optional(),
  })
  .refine((v) => v.mode === "delta" || v.value >= 0, {
    path: ["value"],
    message: "Stock can't be set below zero",
  })
  .refine((v) => v.mode === "set" || v.value !== 0 || v.lowStockThreshold !== undefined, {
    path: ["value"],
    message: "Enter a non-zero adjustment",
  });

export const contactStatusUpdateSchema = z.object({
  status: z.enum(["new", "read", "archived"]),
});
