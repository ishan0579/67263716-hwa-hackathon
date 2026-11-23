/**
 * In-memory demonstration database.
 *
 * Used when DATABASE_URL is not configured (no hosted Postgres available).
 * It stores the flagship product, its variants, inventory, customers and
 * orders in process memory. Every mutation is deterministic and
 * idempotency-keyed so a retried checkout never creates a duplicate order.
 *
 * This keeps the complete buyer journey (browse → configure → order → track)
 * working on the live site without any external database. When DATABASE_URL
 * is set, the real Postgres/Drizzle path in src/server/db/index.ts is used
 * instead.
 */

import { randomUUID, createHash } from "node:crypto";
import type {
  InventoryReason,
  OrderStatus,
  PaymentProvider,
  Product,
  ProductVariant,
  Order,
  OrderItem,
} from "./schema";
import {
  PRODUCT_SLUG,
  COLORWAYS,
  SIZES,
  SEED_STOCK,
  PRODUCT_COPY,
  PRODUCT_SPECS,
} from "@/content/product";
import type { ShippingConfig } from "../services/config";
import type { PublicProduct, PublicVariant } from "../services/catalog";
import type { CheckoutInput, CartLineInput } from "@/lib/validation/checkout";
import type { CreateOrderResult, CustomerOrderView } from "../services/orders";
import type { Quote, QuotedLine } from "../services/quote";

const NOW = () => new Date();

type MemoryRow = Record<string, unknown>;

const tables: Record<string, MemoryRow[]> = {
  products: [],
  productVariants: [],
  productImages: [],
  inventory: [],
  inventoryMovements: [],
  customers: [],
  orders: [],
  orderItems: [],
  orderStatusEvents: [],
  payments: [],
  adminUsers: [],
  adminSessions: [],
  contactSubmissions: [],
  newsletterSubscriptions: [],
  siteConfig: [],
  rateLimits: [],
};

const DEFAULT_SHIPPING: ShippingConfig = {
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

function table<T extends MemoryRow>(name: string): T[] {
  return (tables[name] as T[] | undefined) ?? [];
}

function uid() {
  return randomUUID();
}

function sha256Hex(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

function normaliseTrackingKey(key: string) {
  return key.replace(/\s+/g, "").toUpperCase();
}

function formatTrackingKey(key: string) {
  const groups: string[] = [];
  for (let i = 0; i < key.length; i += 5) groups.push(key.slice(i, i + 5));
  return groups.join("-");
}

function deriveTrackingKey(orderId: string, idempotencyKey: string) {
  return sha256Hex(`${orderId}|${idempotencyKey}`);
}

function hashTrackingKey(key: string) {
  return sha256Hex(key);
}

function generateOrderNumber() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let ref = "";
  for (let i = 0; i < 6; i++) ref += chars[Math.floor(Math.random() * chars.length)];
  return `SO-${ref.slice(0, 3)}-${ref.slice(3)}`;
}

function stockStatusFor(available: number, threshold: number): "in_stock" | "low_stock" | "sold_out" {
  if (available <= 0) return "sold_out";
  if (available <= threshold) return "low_stock";
  return "in_stock";
}

function mergeLines(lines: CartLineInput[]) {
  const map = new Map<string, number>();
  for (const l of lines) map.set(l.variantId, (map.get(l.variantId) ?? 0) + l.quantity);
  return [...map.entries()].map(([variantId, quantity]) => ({ variantId, quantity }));
}

const ISSUE_MESSAGES: Record<string, string> = {
  not_found: "This item is no longer available.",
  unavailable: "This option is currently unavailable.",
  sold_out: "This option just sold out.",
  insufficient_stock: "Only a limited quantity is left.",
  over_limit: "Limit 10 per option.",
};
function describeIssue(issue: string) {
  return ISSUE_MESSAGES[issue] ?? issue;
}

/* ------------------------------------------------------------------ */
/* Seed                                                               */
/* ------------------------------------------------------------------ */

let seeded = false;
function ensureSeed() {
  if (seeded) return;
  seeded = true;

  const productId = uid();
  const now = NOW();
  const product: Product = {
    id: productId,
    slug: PRODUCT_SLUG,
    name: PRODUCT_COPY.name,
    tagline: PRODUCT_COPY.tagline,
    description: PRODUCT_COPY.description,
    conceptNotice: PRODUCT_COPY.conceptNotice,
    specifications: PRODUCT_SPECS,
    highlights: PRODUCT_COPY.highlights,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  table("products").push(product);

  const variantIds: string[] = [];
  for (const color of COLORWAYS) {
    for (const size of SIZES) {
      const variantId = uid();
      const stock = SEED_STOCK[color.key][size.key as keyof typeof SEED_STOCK[string]];
      const variant: ProductVariant = {
        id: variantId,
        productId,
        sku: `SO-${color.key.toUpperCase().replace(/-/g, "")}-${size.key.toUpperCase()}`,
        name: `${color.name} · ${size.label}`,
        colorKey: color.key,
        colorName: color.name,
        colorHex: color.colorHex,
        accentHex: color.accentHex,
        size: size.key,
        sizeLabel: size.label,
        priceCents: size.priceCents,
        isActive: true,
        sortOrder: variantIds.length,
        createdAt: now,
      };
      table("productVariants").push(variant);
      variantIds.push(variantId);
      table("inventory").push({
        variantId,
        onHand: stock,
        reserved: 0,
        lowStockThreshold: 5,
        updatedAt: now,
      });
    }
  }
}

/* ------------------------------------------------------------------ */
/* Public product                                                     */
/* ------------------------------------------------------------------ */

export async function getProductBySlug(slug: string): Promise<PublicProduct | null> {
  ensureSeed();
  const product = table("products").find((p) => p.slug === slug && p.isActive);
  if (!product) return null;

  const variants = table("productVariants")
    .filter((v) => v.productId === product.id && v.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const variantIds = variants.map((v) => v.id);
  const inventoryByVariant = new Map(
    table("inventory").filter((inv) => variantIds.includes(inv.variantId)).map((inv) => [inv.variantId, inv]),
  );
  const images = table("productImages")
    .filter((img) => img.productId === product.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const publicVariants: PublicVariant[] = variants.map((v) => {
    const inv = inventoryByVariant.get(v.id);
    const available = inv ? Math.max(0, (inv.onHand as number) - (inv.reserved as number)) : 0;
    const status = stockStatusFor(available, inv?.lowStockThreshold ?? 0);
    return {
      id: v.id,
      sku: v.sku,
      name: v.name,
      colorKey: v.colorKey,
      colorName: v.colorName,
      colorHex: v.colorHex,
      accentHex: v.accentHex,
      size: v.size,
      sizeLabel: v.sizeLabel,
      priceCents: v.priceCents,
      stockStatus: status,
      lowStockCount: status === "low_stock" ? available : null,
      maxQuantity: Math.max(0, Math.min(available, 10)),
    };
  });

  const priceFromCents = publicVariants.length
    ? Math.min(...publicVariants.map((v) => v.priceCents))
    : 0;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    tagline: product.tagline,
    description: product.description,
    conceptNotice: product.conceptNotice,
    highlights: product.highlights,
    specifications: product.specifications,
    variants: publicVariants,
    images: images.map((i) => ({
      url: i.url,
      alt: i.alt,
      width: i.width,
      height: i.height,
      variantId: i.variantId,
    })),
    priceFromCents,
  };
}

export async function listActiveProducts(): Promise<PublicProduct[]> {
  ensureSeed();
  const out: PublicProduct[] = [];
  for (const p of table("products").filter((x) => x.isActive)) {
    const pp = await getProductBySlug(p.slug);
    if (pp) out.push(pp);
  }
  return out;
}

export async function getVariantAvailability(
  variantIds: string[],
): Promise<Array<{ variantId: string; onHand: number; reserved: number }>> {
  ensureSeed();
  return variantIds.map((id) => {
    const inv = table("inventory").find((i) => i.variantId === id);
    return { variantId: id, onHand: inv?.onHand ?? 0, reserved: inv?.reserved ?? 0 };
  });
}

/* ------------------------------------------------------------------ */
/* Shipping config                                                    */
/* ------------------------------------------------------------------ */

export function getShippingConfig(): ShippingConfig {
  return DEFAULT_SHIPPING;
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
  return false;
}

const MAX_QTY_PER_LINE = 10;

export async function quoteCart(
  input: CartLineInput[],
  shippingMethod = "standard",
): Promise<Quote> {
  ensureSeed();
  const merged = mergeLines(input);
  const product = await getProductBySlug(PRODUCT_SLUG);
  const variantById = new Map(product?.variants.map((v) => [v.id, v]) ?? []);
  const availability = await getVariantAvailability(merged.map((l) => l.variantId));
  const availById = new Map(availability.map((a) => [a.variantId, a]));

  const lines: QuotedLine[] = merged.map((l) => {
    const variant = variantById.get(l.variantId);
    const inv = availById.get(l.variantId);
    const available = inv ? Math.max(0, inv.onHand - inv.reserved) : 0;
    if (!variant) {
      return {
        variantId: l.variantId,
        productId: null,
        productName: "Unavailable item",
        productSlug: null,
        variantName: "",
        sku: "",
        colorName: "",
        colorHex: "#cccccc",
        accentHex: "#cccccc",
        sizeLabel: "",
        requestedQuantity: l.quantity,
        quantity: 0,
        unitPriceCents: 0,
        lineTotalCents: 0,
        available: 0,
        maxQuantity: 0,
        issue: "not_found",
      };
    }
    const purchasable = available > 0;
    const maxQuantity = Math.max(0, Math.min(available, MAX_QTY_PER_LINE));
    let issue: string | null = null;
    if (available <= 0) issue = "sold_out";
    else if (l.quantity > available) issue = "insufficient_stock";
    else if (l.quantity > MAX_QTY_PER_LINE) issue = "over_limit";
    const quantity = issue ? Math.min(l.quantity, maxQuantity) : l.quantity;
    return {
      variantId: variant.id,
      productId: product!.id,
      productName: product!.name,
      productSlug: product!.slug,
      variantName: variant.name,
      sku: variant.sku,
      colorName: variant.colorName,
      colorHex: variant.colorHex,
      accentHex: variant.accentHex,
      sizeLabel: variant.sizeLabel,
      requestedQuantity: l.quantity,
      quantity,
      unitPriceCents: variant.priceCents,
      lineTotalCents: variant.priceCents * quantity,
      available,
      maxQuantity,
      issue,
    };
  });

  const cfg = getShippingConfig();
  const subtotalCents = lines.reduce((s, l) => s + l.lineTotalCents, 0);
  const shippingOptions = shippingOptionsFor(subtotalCents, cfg);
  const method = shippingOptions.find((o) => o.id === shippingMethod) ?? shippingOptions[0]!;
  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);
  const shippingCents = itemCount > 0 ? method.priceCents : 0;
  const taxCents = 0;
  const totalCents = subtotalCents + shippingCents + taxCents;
  const valid = lines.length > 0 && lines.every((l) => l.issue === null);

  return {
    currency: cfg.currency,
    lines,
    subtotalCents,
    shippingOptions,
    shippingMethod: method.id,
    shippingCents,
    taxCents,
    totalCents,
    valid,
    itemCount,
  };
}

/* ------------------------------------------------------------------ */
/* Orders                                                             */
/* ------------------------------------------------------------------ */

function findCustomer(email: string) {
  return table("customers").find((c) => c.email.toLowerCase() === email.toLowerCase());
}

function upsertCustomer(input: {
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
}) {
  let customer = findCustomer(input.email);
  if (!customer) {
    customer = {
      id: uid(),
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      createdAt: NOW(),
    };
    table("customers").push(customer);
  } else {
    customer.firstName = input.firstName;
    customer.lastName = input.lastName;
    customer.phone = input.phone;
  }
  return customer;
}

function fingerprint(input: CheckoutInput) {
  const lines = mergeLines(input.lines).sort((a, b) => a.variantId.localeCompare(b.variantId));
  return sha256Hex(
    JSON.stringify({
      e: input.contact.email.toLowerCase(),
      l: lines,
      m: input.shippingMethod,
      a: [input.shipping.line1, input.shipping.postalCode, input.shipping.country].map((s) =>
        s.trim().toLowerCase(),
      ),
    }),
  );
}

export async function createOrder(
  input: CheckoutInput,
  opts: { idempotencyKey: string; provider: PaymentProvider },
): Promise<CreateOrderResult> {
  ensureSeed();
  const fp = fingerprint(input);
  const lines = mergeLines(input.lines);

  // Idempotency: a retried submission returns the same order.
  const existing = table("orders").find((o) => o.idempotencyKey === opts.idempotencyKey);
  if (existing) {
    const key = deriveTrackingKey(existing.id as string, opts.idempotencyKey);
    const valid = safeEqualHex(hashTrackingKey(key), existing.accessTokenHash as string);
    const items = await getOrderItems(existing.id as string);
    return {
      orderId: existing.id as string,
      orderNumber: existing.orderNumber as string,
      trackingKey: valid ? formatTrackingKey(key) : null,
      status: existing.status as OrderStatus,
      paymentProvider: existing.paymentProvider as PaymentProvider,
      totalCents: existing.totalCents as number,
      replayed: true,
      _items: items,
    } as unknown as CreateOrderResult;
  }

  // Authoritative pricing + availability from the in-memory catalogue.
  const variantIds = lines.map((l) => l.variantId);
  const availability = await getVariantAvailability(variantIds);
  const availById = new Map(availability.map((a) => [a.variantId, a]));
  const product = await getProductBySlug(PRODUCT_SLUG);
  const variantById = new Map(
    product?.variants.map((v) => [v.id, v]) ?? [],
  );

  let subtotalCents = 0;
  const orderLines: Array<{
    variantId: string;
    productId: string;
    variantName: string;
    sku: string;
    colorName: string;
    colorHex: string;
    sizeLabel: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
  }> = [];

  for (const l of lines) {
    const inv = availById.get(l.variantId);
    const variant = variantById.get(l.variantId);
    if (!variant || !inv) continue;
    const available = Math.max(0, inv.onHand - inv.reserved);
    if (available <= 0 || l.quantity > available || l.quantity > 10) continue;
    const unitPriceCents = variant.priceCents;
    const lineTotalCents = unitPriceCents * l.quantity;
    subtotalCents += lineTotalCents;
    orderLines.push({
      variantId: l.variantId,
      productId: product!.id,
      variantName: variant.name,
      sku: variant.sku,
      colorName: variant.colorName,
      colorHex: variant.colorHex,
      sizeLabel: variant.sizeLabel,
      quantity: l.quantity,
      unitPriceCents,
      lineTotalCents,
    });
  }

  const cfg = getShippingConfig();
  const shippingOptions = shippingOptionsFor(subtotalCents, cfg);
  const method = shippingOptions.find((o) => o.id === input.shippingMethod) ?? shippingOptions[0]!;
  const itemCount = orderLines.reduce((s, l) => s + l.quantity, 0);
  const shippingCents = itemCount > 0 ? method.priceCents : 0;
  const taxCents = 0;
  const totalCents = subtotalCents + shippingCents + taxCents;
  const valid = orderLines.length === lines.length && orderLines.every((l) => l.quantity > 0);
  if (!valid) {
    throw new Error("cart_conflict");
  }

  const email = input.contact.email.toLowerCase();
  const phone = input.contact.phone || null;
  const customer = upsertCustomer({
    email,
    firstName: input.contact.firstName,
    lastName: input.contact.lastName,
    phone,
  });

  const orderId = uid();
  const trackingKey = deriveTrackingKey(orderId, opts.idempotencyKey);
  const status: OrderStatus =
    opts.provider === "stripe" ? "pending_payment" : "confirmed";
  const orderNumber = generateOrderNumber();
  const now = NOW();

  const order: Order = {
    id: orderId,
    orderNumber,
    customerId: customer.id,
    email,
    firstName: input.contact.firstName,
    lastName: input.contact.lastName,
    phone,
    status,
    paymentProvider: opts.provider,
    currency: cfg.currency,
    subtotalCents,
    shippingCents,
    taxCents,
    totalCents,
    shippingMethod: method.id,
    shippingMethodLabel: `${method.label} — ${method.description}`,
    shipName: `${input.contact.firstName} ${input.contact.lastName}`,
    shipLine1: input.shipping.line1,
    shipLine2: input.shipping.line2 ?? null,
    shipCity: input.shipping.city,
    shipRegion: input.shipping.region,
    shipPostalCode: input.shipping.postalCode,
    shipCountry: input.shipping.country,
    customerNote: input.note ?? null,
    accessTokenHash: hashTrackingKey(trackingKey),
    idempotencyKey: opts.idempotencyKey,
    requestFingerprint: fp,
    isDemo: true,
    createdAt: now,
    updatedAt: now,
  };
  table("orders").push(order);

  for (const l of orderLines) {
    table("orderItems").push({
      id: uid(),
      orderId,
      productId: l.productId,
      variantId: l.variantId,
      productName: (await getProductBySlug(PRODUCT_SLUG))?.name ?? "",
      variantName: l.variantName,
      sku: l.sku,
      colorName: l.colorName,
      colorHex: l.colorHex,
      sizeLabel: l.sizeLabel,
      unitPriceCents: l.unitPriceCents,
      quantity: l.quantity,
      lineTotalCents: l.lineTotalCents,
    });
    const inv = table("inventory").find((i) => i.variantId === l.variantId);
    if (inv) {
      inv.onHand = (inv.onHand as number) - l.quantity;
      inv.updatedAt = now;
      table("inventoryMovements").push({
        id: uid(),
        variantId: l.variantId,
        reason: opts.provider === "stripe" ? "reservation" : "sale",
        onHandDelta: opts.provider === "stripe" ? 0 : -l.quantity,
        reservedDelta: opts.provider === "stripe" ? l.quantity : 0,
        onHandAfter: inv.onHand as number,
        reservedAfter: inv.reserved as number,
        orderId,
        adminUserId: null,
        note: opts.provider === "stripe" ? `Reserved for ${orderNumber}` : `Test order ${orderNumber}`,
        createdAt: now,
      });
    }
  }

  table("orderStatusEvents").push({
    id: uid(),
    orderId,
    fromStatus: null,
    toStatus: status,
    actor: "customer",
    adminUserId: null,
    note:
      opts.provider === "stripe"
        ? "Order created — awaiting Stripe test-mode payment."
        : "Test order placed — no payment requested or taken.",
    createdAt: now,
  });

  table("payments").push({
    id: uid(),
    orderId,
    provider: opts.provider,
    status: opts.provider === "stripe" ? "pending" : "not_charged",
    amountCents: totalCents,
    currency: cfg.currency,
    providerReference: null,
    createdAt: now,
    updatedAt: now,
  });

  return {
    orderId,
    orderNumber,
    trackingKey: formatTrackingKey(trackingKey),
    status,
    paymentProvider: opts.provider,
    totalCents,
    replayed: false,
  };
}

function safeEqualHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  ensureSeed();
  return (table("orders").find((o) => o.orderNumber === orderNumber.toUpperCase()) ?? null);
}

export async function getOrderByToken(token: string): Promise<Order | null> {
  ensureSeed();
  const normalised = normaliseTrackingKey(token);
  if (normalised.length !== 20) return null;
  const candidateHash = hashTrackingKey(normalised);
  return (
    table("orders").find((o) => safeEqualHex(candidateHash, o.accessTokenHash as string)) ?? null
  );
}

export async function getOrderItems(orderId: string): Promise<OrderItem[]> {
  ensureSeed();
  return table("orderItems").filter((i) => i.orderId === orderId);
}

export async function listOrders(): Promise<Order[]> {
  ensureSeed();
  return [...table("orders")].sort(
    (a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime(),
  );
}

export async function buildView(order: Order): Promise<CustomerOrderView> {
  const items = await getOrderItems(order.id as string);
  const events = table("orderStatusEvents")
    .filter((e) => e.orderId === order.id)
    .sort(
      (a, b) =>
        new Date(a.createdAt as any).getTime() - new Date(b.createdAt as any).getTime(),
    );
  const payment = table("payments")
    .filter((p) => p.orderId === order.id)
    .sort(
      (a, b) =>
        new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime(),
    )[0];
  return {
    orderNumber: order.orderNumber,
    status: order.status as OrderStatus,
    statusLabel: {
      pending_payment: "Awaiting payment",
      confirmed: "Confirmed",
      processing: "Preparing",
      shipped: "Shipped",
      delivered: "Delivered",
      cancelled: "Cancelled",
    }[order.status as OrderStatus],
    createdAt: order.createdAt.toISOString(),
    email: order.email,
    firstName: order.firstName,
    lastName: order.lastName,
    phone: order.phone,
    shipping: {
      name: order.shipName,
      line1: order.shipLine1,
      line2: order.shipLine2,
      city: order.shipCity,
      region: order.shipRegion,
      postalCode: order.shipPostalCode,
      country: order.shipCountry,
    },
    shippingMethodLabel: order.shippingMethodLabel,
    currency: order.currency,
    subtotalCents: order.subtotalCents,
    shippingCents: order.shippingCents,
    taxCents: order.taxCents,
    totalCents: order.totalCents,
    paymentProvider: order.paymentProvider as PaymentProvider,
    paymentStatus: payment?.status ?? "not_charged",
    isDemo: order.isDemo,
    items: items.map((i) => ({
      productName: i.productName,
      variantName: i.variantName,
      colorName: i.colorName,
      colorHex: i.colorHex,
      sizeLabel: i.sizeLabel,
      sku: i.sku,
      quantity: i.quantity,
      unitPriceCents: i.unitPriceCents,
      lineTotalCents: i.lineTotalCents,
    })),
    timeline: events.map((e) => ({
      status: e.toStatus as OrderStatus,
      label: {
        pending_payment: "Awaiting payment",
        confirmed: "Confirmed",
        processing: "Preparing",
        shipped: "Shipped",
        delivered: "Delivered",
        cancelled: "Cancelled",
      }[e.toStatus as OrderStatus],
      at: e.createdAt.toISOString(),
    })),
  };
}

export async function getOrderViewById(orderId: string): Promise<CustomerOrderView | null> {
  const order = await getOrderByNumber(orderId);
  if (!order) {
    // orderId may be the internal uuid, not the orderNumber
    const byId = table("orders").find((o) => o.id === orderId);
    if (!byId) return null;
    return buildView(byId);
  }
  return buildView(order);
}

export async function getOrderForCustomer(
  orderNumber: string,
  trackingKey: string,
): Promise<CustomerOrderView | null> {
  const normalised = normaliseTrackingKey(trackingKey);
  const candidateHash = hashTrackingKey(normalised);
  const order = table("orders").find((o) => o.orderNumber === orderNumber.toUpperCase());
  const stored = order?.accessTokenHash ?? "0".repeat(64);
  const match = safeEqualHex(candidateHash, stored);
  if (!order || !match || normalised.length !== 20) return null;
  return buildView(order);
}

export async function expireStalePendingOrders(): Promise<number> {
  return 0;
}
