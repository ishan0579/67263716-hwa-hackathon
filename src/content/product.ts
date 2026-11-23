/**
 * Canonical definition of the flagship product. Used by the seed script to
 * populate the database. At runtime the storefront always reads the database
 * (admins can change prices, copy and stock), never this file.
 */
import type { SpecRow } from "@/server/db/schema";

export const PRODUCT_SLUG = "snifforbit-one";

export type Colorway = {
  key: string;
  name: string;
  description: string;
  colorHex: string;
  accentHex: string;
};

export const COLORWAYS: Colorway[] = [
  {
    key: "morning-walk",
    name: "Morning Walk",
    description: "Ivory shell · coral shutter",
    colorHex: "#F1EBDD",
    accentHex: "#FF794B",
  },
  {
    key: "deep-woods",
    name: "Deep Woods",
    description: "Forest teal shell · mint shutter",
    colorHex: "#124147",
    accentHex: "#B9E5DB",
  },
  {
    key: "fresh-trail",
    name: "Fresh Trail",
    description: "Mint shell · graphite shutter",
    colorHex: "#B9E5DB",
    accentHex: "#2A3138",
  },
  {
    key: "sunset-fetch",
    name: "Sunset Fetch",
    description: "Coral shell · cream shutter",
    colorHex: "#FF794B",
    accentHex: "#FFF9F0",
  },
];

export const SIZES = [
  {
    key: "standard",
    label: "Standard · Ø 28 cm",
    priceCents: 12900,
    guidance: "Proposed for small to medium dogs (approx. 5–20 kg).",
  },
  {
    key: "large",
    label: "Large · Ø 34 cm",
    priceCents: 14900,
    guidance: "Proposed for medium to large dogs (approx. 15–40 kg).",
  },
] as const;

export type SizeKey = (typeof SIZES)[number]["key"];

/** Demo stock levels: one low-stock and one sold-out variant demonstrate inventory states. */
export const SEED_STOCK: Record<string, Record<SizeKey, number>> = {
  "morning-walk": { standard: 40, large: 24 },
  "deep-woods": { standard: 32, large: 18 },
  "fresh-trail": { standard: 26, large: 4 },
  "sunset-fetch": { standard: 20, large: 0 },
};

export const PRODUCT_COPY = {
  name: "SniffOrbit ONE",
  tagline: "Every playtime, a new discovery.",
  description:
    "SniffOrbit ONE is a modular enrichment puzzle concept built around six treat chambers and a spring-return sliding shutter. Each time the shutter closes, a proposed ratchet mechanism indexes the tray by one chamber, so the next discovery is waiting behind the same door. Interchangeable chamber inserts let owners vary the challenge.",
  conceptNotice:
    "SniffOrbit ONE is a product concept. It has not been manufactured, safety-certified or behaviourally tested. Orders in this store are demonstration orders: no payment is taken and nothing ships.",
  highlights: [
    "Six individually loadable treat chambers",
    "Large spring-return shutter sized for noses and paws",
    "Proposed ratchet indexing — one chamber per cycle, no batteries",
    "Interchangeable chamber inserts for adjustable difficulty",
    "Removable food-contact tray designed for cleaning",
    "Weighted body with non-slip elastomer base ring",
  ],
};

export const PRODUCT_SPECS: SpecRow[] = [
  { group: "Dimensions", label: "Standard", value: "Ø 28 cm × 9.5 cm", provisional: true },
  { group: "Dimensions", label: "Large", value: "Ø 34 cm × 11 cm", provisional: true },
  { group: "Dimensions", label: "Target weight", value: "1.4 kg (Standard) · 2.1 kg (Large)", provisional: true },
  { group: "Dimensions", label: "Chamber volume", value: "≈ 30 ml each (Standard) · ≈ 45 ml (Large)", provisional: true },
  { group: "Materials", label: "Tray & inserts", value: "Food-contact grade polypropylene (proposed)", provisional: true },
  { group: "Materials", label: "Shell", value: "Polypropylene with soft-touch TPE overmould (proposed)", provisional: true },
  { group: "Materials", label: "Base ring", value: "Non-slip thermoplastic elastomer (proposed)", provisional: true },
  { group: "Materials", label: "Springs & pawl", value: "Enclosed stainless steel (proposed)", provisional: true },
  { group: "Mechanism", label: "Indexing", value: "Ratchet & pawl, 6 positions × 60°", provisional: true },
  { group: "Mechanism", label: "Power", value: "None — fully mechanical, no batteries" },
  { group: "Mechanism", label: "Difficulty", value: "4 insert types · 3 suggested starting levels", provisional: true },
  { group: "Care", label: "Cleaning", value: "Tray and inserts lift out for washing; hand-wash recommended until dishwasher testing is complete", provisional: true },
  { group: "Care", label: "Assembly", value: "Tool-free: base → indexing ring → keyed tray → twist-lock lid", provisional: true },
  { group: "Status", label: "Development stage", value: "Design concept · not manufactured or certified" },
];
