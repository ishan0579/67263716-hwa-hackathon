/**
 * Pure, client-safe helpers and label maps for the admin UI.
 * (Never import server modules from here — client components use it.)
 */
import type { InventoryReason, PaymentProvider, PaymentStatus } from "@/server/db/schema";
import { CONTACT_TOPICS } from "@/lib/validation/forms";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  not_charged: "Not charged",
  pending: "Pending",
  succeeded: "Succeeded",
  failed: "Failed",
  expired: "Expired",
  refunded: "Refunded",
};

export const PROVIDER_LABELS: Record<PaymentProvider, string> = {
  test_mode: "Test mode",
  stripe: "Stripe (test mode)",
};

export const REASON_LABELS: Record<InventoryReason, string> = {
  initial_stock: "Initial stock",
  restock: "Restock",
  adjustment: "Adjustment",
  sale: "Sale",
  reservation: "Reserved",
  reservation_release: "Reservation released",
  reservation_commit: "Reservation committed",
  cancellation_restock: "Cancellation restock",
};

export const ACTOR_LABELS = {
  system: "System",
  customer: "Customer",
  admin: "Admin",
} as const;

export function topicLabel(topic: string) {
  return CONTACT_TOPICS.find((t) => t.value === topic)?.label ?? topic;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

/** First value of a Next.js searchParams entry. */
export function firstParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** Builds `?a=1&b=2`, dropping empty values. Returns "" when nothing remains. */
export function buildQuery(params: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function slugify(input: string, max = 120) {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
}

/** "129", "129.5", "$1,299.00" → integer cents. Returns null when not a valid amount. */
export function dollarsToCents(input: string): number | null {
  const clean = input.replace(/[$,\s]/g, "");
  if (!/^\d{1,7}(\.\d{0,2})?$/.test(clean)) return null;
  const [whole, frac = ""] = clean.split(".");
  return Number(whole) * 100 + Number((frac + "00").slice(0, 2));
}

export function centsToDollars(cents: number) {
  return (cents / 100).toFixed(2);
}

/** "+3", "−2", "0" (true minus sign for legibility). */
export function formatDelta(n: number) {
  if (n > 0) return `+${n}`;
  if (n < 0) return `−${Math.abs(n)}`;
  return "0";
}

/** Parses a whole number from a form field; null when blank or invalid. */
export function parseWhole(input: string): number | null {
  const t = input.trim();
  if (!/^-?\d+$/.test(t)) return null;
  const n = Number(t);
  return Number.isSafeInteger(n) ? n : null;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase() || "A";
}
