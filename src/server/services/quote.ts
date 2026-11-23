import { eq, inArray } from "drizzle-orm";
import { db as rootDb, type DbOrTx } from "../db";
import { inventory, products, productVariants } from "../db/schema";
import { MAX_QTY_PER_LINE, type CartLineInput, type ShippingMethodId } from "@/lib/validation/checkout";
import { getShippingConfig, shippingOptionsFor } from "./config";

export type LineIssue = "not_found" | "unavailable" | "sold_out" | "insufficient_stock" | "over_limit";

export type QuotedLine = {
  variantId: string;
  productId: string | null;
  productName: string;
  productSlug: string | null;
  variantName: string;
  sku: string;
  colorName: string;
  colorHex: string;
  accentHex: string;
  sizeLabel: string;
  requestedQuantity: number;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  available: number;
  maxQuantity: number;
  issue: LineIssue | null;
};

export type Quote = {
  currency: string;
  lines: QuotedLine[];
  subtotalCents: number;
  shippingOptions: ReturnType<typeof shippingOptionsFor>;
  shippingMethod: ShippingMethodId;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  valid: boolean;
  itemCount: number;
};

/** Combines duplicate variant lines (e.g. added twice from different pages). */
export function mergeLines(lines: CartLineInput[]) {
  const map = new Map<string, number>();
  for (const l of lines) map.set(l.variantId, (map.get(l.variantId) ?? 0) + l.quantity);
  return [...map.entries()].map(([variantId, quantity]) => ({ variantId, quantity }));
}

const ISSUE_MESSAGES: Record<LineIssue, string> = {
  not_found: "This item is no longer available.",
  unavailable: "This option is currently unavailable.",
  sold_out: "This option just sold out.",
  insufficient_stock: "Only a limited quantity is left.",
  over_limit: `Limit ${MAX_QTY_PER_LINE} per option.`,
};

export function describeIssue(issue: LineIssue) {
  return ISSUE_MESSAGES[issue];
}

/**
 * Authoritative pricing. Prices, names and stock always come from the database;
 * the client only supplies variant ids and quantities. Pass `lockedInventory`
 * from inside an order transaction to price against row-locked stock levels.
 */
export async function quoteCart(
  input: CartLineInput[],
  shippingMethod: ShippingMethodId = "standard",
  db: DbOrTx = rootDb,
  lockedInventory?: Map<string, { onHand: number; reserved: number }>,
): Promise<Quote> {
  const merged = mergeLines(input);
  const ids = merged.map((l) => l.variantId);
  const rows = ids.length
    ? await db
        .select({ v: productVariants, p: products, inv: inventory })
        .from(productVariants)
        .innerJoin(products, eq(products.id, productVariants.productId))
        .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
        .where(inArray(productVariants.id, ids))
    : [];
  const byId = new Map(rows.map((r) => [r.v.id, r]));

  const lines: QuotedLine[] = merged.map((l) => {
    const r = byId.get(l.variantId);
    if (!r) {
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
    const inv = lockedInventory?.get(l.variantId) ?? r.inv ?? { onHand: 0, reserved: 0 };
    const available = Math.max(0, inv.onHand - inv.reserved);
    const purchasable = r.v.isActive && r.p.isActive;
    const maxQuantity = purchasable ? Math.min(available, MAX_QTY_PER_LINE) : 0;
    let issue: LineIssue | null = null;
    if (!purchasable) issue = "unavailable";
    else if (available <= 0) issue = "sold_out";
    else if (l.quantity > available) issue = "insufficient_stock";
    else if (l.quantity > MAX_QTY_PER_LINE) issue = "over_limit";
    const quantity = issue ? Math.min(l.quantity, maxQuantity) : l.quantity;
    return {
      variantId: r.v.id,
      productId: r.p.id,
      productName: r.p.name,
      productSlug: r.p.slug,
      variantName: r.v.name,
      sku: r.v.sku,
      colorName: r.v.colorName,
      colorHex: r.v.colorHex,
      accentHex: r.v.accentHex,
      sizeLabel: r.v.sizeLabel,
      requestedQuantity: l.quantity,
      quantity,
      unitPriceCents: r.v.priceCents,
      lineTotalCents: r.v.priceCents * quantity,
      available,
      maxQuantity,
      issue,
    };
  });

  const cfg = await getShippingConfig(db);
  const subtotalCents = lines.reduce((s, l) => s + l.lineTotalCents, 0);
  const shippingOptions = shippingOptionsFor(subtotalCents, cfg);
  const method = shippingOptions.find((o) => o.id === shippingMethod) ?? shippingOptions[0]!;
  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);
  const shippingCents = itemCount > 0 ? method.priceCents : 0;
  const taxCents = 0; // Demonstration store: no sales tax is calculated or collected.

  return {
    currency: cfg.currency,
    lines,
    subtotalCents,
    shippingOptions,
    shippingMethod: method.id,
    shippingCents,
    taxCents,
    totalCents: subtotalCents + shippingCents + taxCents,
    valid: lines.length > 0 && lines.every((l) => l.issue === null),
    itemCount,
  };
}
