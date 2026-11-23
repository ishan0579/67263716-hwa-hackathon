/**
 * SniffOrbit database schema (PostgreSQL / Drizzle ORM).
 *
 * Money is always stored as integer minor units (cents).
 * Inventory is tracked per variant: `available = on_hand - reserved`.
 *  - Test-mode orders decrement `on_hand` immediately (a "sale").
 *  - Stripe orders first *reserve* stock, then convert the reservation into a
 *    sale when payment succeeds, or release it when the session expires.
 * Every stock change writes an `inventory_movements` row for auditability.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/* ───────────────────────────── Enums ───────────────────────────── */

export const orderStatusEnum = pgEnum("order_status", [
  "pending_payment",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
]);

export const paymentProviderEnum = pgEnum("payment_provider", ["test_mode", "stripe"]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "not_charged", // test-mode order: no payment was requested or taken
  "pending",
  "succeeded",
  "failed",
  "expired",
  "refunded",
]);

export const inventoryReasonEnum = pgEnum("inventory_reason", [
  "initial_stock",
  "restock",
  "adjustment",
  "sale",
  "reservation",
  "reservation_release",
  "reservation_commit",
  "cancellation_restock",
]);

export const actorEnum = pgEnum("event_actor", ["system", "customer", "admin"]);

export const contactStatusEnum = pgEnum("contact_status", ["new", "read", "archived"]);

export const newsletterStatusEnum = pgEnum("newsletter_status", ["subscribed", "unsubscribed"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/* ──────────────────────────── Admin auth ─────────────────────────── */

export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 254 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("admin_users_email_uq").on(t.email)],
);

export const adminSessions = pgTable(
  "admin_sessions",
  {
    /** SHA-256 hash of the session token. The raw token only lives in the cookie. */
    id: varchar("id", { length: 64 }).primaryKey(),
    adminUserId: uuid("admin_user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userAgent: varchar("user_agent", { length: 300 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("admin_sessions_user_idx").on(t.adminUserId),
    index("admin_sessions_expires_idx").on(t.expiresAt),
  ],
);

/* ───────────────────────────── Catalog ───────────────────────────── */

export type SpecRow = {
  group: string;
  label: string;
  value: string;
  /** True when the value is a design target that has not been validated. */
  provisional?: boolean;
};

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 120 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    tagline: varchar("tagline", { length: 240 }).notNull().default(""),
    description: text("description").notNull().default(""),
    /** Short honest note about development status, shown near purchase CTAs. */
    conceptNotice: text("concept_notice").notNull().default(""),
    specifications: jsonb("specifications").$type<SpecRow[]>().notNull().default([]),
    highlights: jsonb("highlights").$type<string[]>().notNull().default([]),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("products_slug_uq").on(t.slug), index("products_active_idx").on(t.isActive)],
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: varchar("sku", { length: 64 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    colorKey: varchar("color_key", { length: 40 }).notNull(),
    colorName: varchar("color_name", { length: 80 }).notNull(),
    /** Primary shell colour and accent colour used by the 3D configurator. */
    colorHex: varchar("color_hex", { length: 7 }).notNull(),
    accentHex: varchar("accent_hex", { length: 7 }).notNull(),
    size: varchar("size", { length: 20 }).notNull(),
    sizeLabel: varchar("size_label", { length: 80 }).notNull(),
    priceCents: integer("price_cents").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("product_variants_sku_uq").on(t.sku),
    uniqueIndex("product_variants_combo_uq").on(t.productId, t.colorKey, t.size),
    index("product_variants_product_idx").on(t.productId),
    check("product_variants_price_ck", sql`${t.priceCents} >= 0`),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: text("alt").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("product_images_product_idx").on(t.productId),
    index("product_images_variant_idx").on(t.variantId),
  ],
);

/* ──────────────────────────── Inventory ──────────────────────────── */

export const inventory = pgTable(
  "inventory",
  {
    variantId: uuid("variant_id")
      .primaryKey()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    onHand: integer("on_hand").notNull().default(0),
    reserved: integer("reserved").notNull().default(0),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    check("inventory_on_hand_ck", sql`${t.onHand} >= 0`),
    check("inventory_reserved_ck", sql`${t.reserved} >= 0 AND ${t.reserved} <= ${t.onHand}`),
    check("inventory_threshold_ck", sql`${t.lowStockThreshold} >= 0`),
  ],
);

export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    reason: inventoryReasonEnum("reason").notNull(),
    /** Change applied to on_hand. */
    onHandDelta: integer("on_hand_delta").notNull().default(0),
    /** Change applied to reserved. */
    reservedDelta: integer("reserved_delta").notNull().default(0),
    onHandAfter: integer("on_hand_after").notNull(),
    reservedAfter: integer("reserved_after").notNull(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    adminUserId: uuid("admin_user_id").references(() => adminUsers.id, { onDelete: "set null" }),
    note: varchar("note", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("inventory_movements_variant_idx").on(t.variantId, t.createdAt),
    index("inventory_movements_order_idx").on(t.orderId),
    index("inventory_movements_created_idx").on(t.createdAt),
  ],
);

/* ───────────────────────────── Customers ─────────────────────────── */

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Stored lower-cased. Guest checkout records, not accounts. */
    email: varchar("email", { length: 254 }).notNull(),
    firstName: varchar("first_name", { length: 80 }).notNull(),
    lastName: varchar("last_name", { length: 80 }).notNull(),
    phone: varchar("phone", { length: 40 }),
    ...timestamps,
  },
  (t) => [uniqueIndex("customers_email_uq").on(t.email)],
);

/* ────────────────────────────── Orders ───────────────────────────── */

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Random, non-sequential public reference such as SO-7KQ2-M9XD. Not a secret. */
    orderNumber: varchar("order_number", { length: 20 }).notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    email: varchar("email", { length: 254 }).notNull(),
    firstName: varchar("first_name", { length: 80 }).notNull(),
    lastName: varchar("last_name", { length: 80 }).notNull(),
    phone: varchar("phone", { length: 40 }),
    status: orderStatusEnum("status").notNull(),
    paymentProvider: paymentProviderEnum("payment_provider").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    subtotalCents: integer("subtotal_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull(),
    taxCents: integer("tax_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    shippingMethod: varchar("shipping_method", { length: 40 }).notNull(),
    shippingMethodLabel: varchar("shipping_method_label", { length: 120 }).notNull(),
    shipName: varchar("ship_name", { length: 160 }).notNull(),
    shipLine1: varchar("ship_line1", { length: 200 }).notNull(),
    shipLine2: varchar("ship_line2", { length: 200 }),
    shipCity: varchar("ship_city", { length: 120 }).notNull(),
    shipRegion: varchar("ship_region", { length: 120 }).notNull(),
    shipPostalCode: varchar("ship_postal_code", { length: 20 }).notNull(),
    shipCountry: varchar("ship_country", { length: 2 }).notNull(),
    customerNote: varchar("customer_note", { length: 500 }),
    /** SHA-256 of the guest tracking key. The key itself is shown once to the customer. */
    accessTokenHash: varchar("access_token_hash", { length: 64 }).notNull(),
    /** Client-generated idempotency key; a retried submission returns the same order. */
    idempotencyKey: varchar("idempotency_key", { length: 80 }).notNull(),
    /** Hash of the normalised request so a reused key with a different cart is rejected. */
    requestFingerprint: varchar("request_fingerprint", { length: 64 }).notNull(),
    isDemo: boolean("is_demo").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("orders_number_uq").on(t.orderNumber),
    uniqueIndex("orders_idempotency_uq").on(t.idempotencyKey),
    index("orders_status_idx").on(t.status),
    index("orders_created_idx").on(t.createdAt),
    index("orders_email_idx").on(t.email),
    index("orders_customer_idx").on(t.customerId),
    check("orders_totals_ck", sql`${t.totalCents} = ${t.subtotalCents} + ${t.shippingCents} + ${t.taxCents}`),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "restrict" }),
    productName: varchar("product_name", { length: 160 }).notNull(),
    variantName: varchar("variant_name", { length: 160 }).notNull(),
    sku: varchar("sku", { length: 64 }).notNull(),
    colorName: varchar("color_name", { length: 80 }).notNull(),
    colorHex: varchar("color_hex", { length: 7 }).notNull(),
    sizeLabel: varchar("size_label", { length: 80 }).notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
  },
  (t) => [
    index("order_items_order_idx").on(t.orderId),
    index("order_items_variant_idx").on(t.variantId),
    check("order_items_qty_ck", sql`${t.quantity} > 0`),
    check("order_items_total_ck", sql`${t.lineTotalCents} = ${t.unitPriceCents} * ${t.quantity}`),
  ],
);

export const orderStatusEvents = pgTable(
  "order_status_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: orderStatusEnum("from_status"),
    toStatus: orderStatusEnum("to_status").notNull(),
    actor: actorEnum("actor").notNull(),
    adminUserId: uuid("admin_user_id").references(() => adminUsers.id, { onDelete: "set null" }),
    note: varchar("note", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_status_events_order_idx").on(t.orderId, t.createdAt)],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    provider: paymentProviderEnum("provider").notNull(),
    status: paymentStatusEnum("status").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    /** e.g. Stripe Checkout Session id. Never card data. */
    providerReference: varchar("provider_reference", { length: 255 }),
    ...timestamps,
  },
  (t) => [
    index("payments_order_idx").on(t.orderId),
    uniqueIndex("payments_provider_ref_uq").on(t.providerReference),
  ],
);

/* ───────────────────────── Customer contact ──────────────────────── */

export const contactSubmissions = pgTable(
  "contact_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 254 }).notNull(),
    topic: varchar("topic", { length: 40 }).notNull(),
    orderReference: varchar("order_reference", { length: 20 }),
    message: text("message").notNull(),
    status: contactStatusEnum("status").notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("contact_submissions_status_idx").on(t.status),
    index("contact_submissions_created_idx").on(t.createdAt),
  ],
);

export const newsletterSubscriptions = pgTable(
  "newsletter_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 254 }).notNull(),
    status: newsletterStatusEnum("status").notNull().default("subscribed"),
    source: varchar("source", { length: 40 }).notNull().default("footer"),
    ...timestamps,
  },
  (t) => [uniqueIndex("newsletter_email_uq").on(t.email)],
);

/* ───────────────────────── Configuration ─────────────────────────── */

export const siteConfig = pgTable("site_config", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: jsonb("value").notNull(),
  description: varchar("description", { length: 300 }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/** Fixed-window rate limit counters (shared across serverless instances). */
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: varchar("key", { length: 160 }).primaryKey(),
    count: integer("count").notNull().default(0),
    resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("rate_limits_reset_idx").on(t.resetAt)],
);

/* ───────────────────────────── Types ─────────────────────────────── */

export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type PaymentProvider = (typeof paymentProviderEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
export type InventoryReason = (typeof inventoryReasonEnum.enumValues)[number];
export type Product = typeof products.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
