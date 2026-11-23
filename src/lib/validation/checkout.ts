import { z } from "zod";

export const MAX_QTY_PER_LINE = 5;

export const COUNTRIES = [
  { code: "US", name: "United States", regionLabel: "State", postalLabel: "ZIP code" },
  { code: "CA", name: "Canada", regionLabel: "Province", postalLabel: "Postal code" },
] as const;

export type CountryCode = (typeof COUNTRIES)[number]["code"];

const name = (label: string) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(80, `${label} is too long`);

export const cartLineSchema = z.object({
  variantId: z.uuid({ error: "Unknown product option" }),
  quantity: z
    .number()
    .int()
    .min(1, "Quantity must be at least 1")
    .max(MAX_QTY_PER_LINE, `You can order up to ${MAX_QTY_PER_LINE} of each option`),
});

export const cartLinesSchema = z
  .array(cartLineSchema)
  .min(1, "Your cart is empty")
  .max(20, "Too many cart lines");

export type CartLineInput = z.infer<typeof cartLineSchema>;

export const shippingMethodSchema = z.enum(["standard", "express"]);
export type ShippingMethodId = z.infer<typeof shippingMethodSchema>;

export const contactDetailsSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Enter a valid email address" }).max(254)),
  firstName: name("First name"),
  lastName: name("Last name"),
  phone: z
    .string()
    .trim()
    .max(40, "Phone number is too long")
    .regex(/^[+()\d\s.-]*$/, "Use digits, spaces and + ( ) - only")
    .optional()
    .or(z.literal("")),
});

export const shippingAddressSchema = z
  .object({
    line1: z.string().trim().min(3, "Street address is required").max(200),
    line2: z.string().trim().max(200).optional().or(z.literal("")),
    city: z.string().trim().min(2, "City is required").max(120),
    region: z.string().trim().min(2, "State / province is required").max(120),
    postalCode: z.string().trim().min(3, "Postal code is required").max(20),
    country: z.enum(["US", "CA"], { error: "We currently ship demo orders to the US and Canada only" }),
  })
  .superRefine((v, ctx) => {
    const ok =
      v.country === "US"
        ? /^\d{5}(-\d{4})?$/.test(v.postalCode)
        : /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(v.postalCode);
    if (!ok) {
      ctx.addIssue({
        code: "custom",
        path: ["postalCode"],
        message: v.country === "US" ? "Enter a 5-digit ZIP code" : "Enter a postal code like K1A 0B1",
      });
    }
  });

export const checkoutSchema = z.object({
  contact: contactDetailsSchema,
  shipping: shippingAddressSchema,
  shippingMethod: shippingMethodSchema,
  lines: cartLinesSchema,
  note: z.string().trim().max(500, "Keep notes under 500 characters").optional().or(z.literal("")),
  acceptTerms: z.literal(true, { error: "Please confirm you understand this is a test order" }),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const quoteSchema = z.object({
  lines: z.array(cartLineSchema).max(20),
  shippingMethod: shippingMethodSchema.optional(),
});

export const idempotencyKeySchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{16,80}$/, "Invalid idempotency key");

export const orderLookupSchema = z.object({
  orderNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^SO-[0-9A-Z]{4}-[0-9A-Z]{4}$/, "Order references look like SO-XXXX-XXXX"),
  trackingKey: z
    .string()
    .trim()
    .min(20, "Tracking keys are 20 characters (dashes optional)")
    .max(40),
});
