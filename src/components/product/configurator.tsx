"use client";

import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { PublicProduct, PublicVariant } from "@/server/services/catalog";
import { cartStore } from "@/lib/cart/store";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useCartUI } from "../cart/cart-ui";
import { Button } from "../ui/button";
import { Check, Info, Truck } from "../ui/icons";
import { QuantityStepper } from "../ui/misc";
import { useToast } from "../ui/toast";

const ProductViewer = dynamic(() => import("../three/product-viewer"), {
  ssr: false,
  loading: () => (
    <div className="grid size-full place-items-center">
      <span className="text-sm text-graphite/50">Loading 3D view…</span>
    </div>
  ),
});

export type Recommendation = { size: "standard" | "large"; level: 1 | 2 | 3; reason?: string };

const SIZE_COPY: Record<string, { dims: string; guidance: string }> = {
  standard: { dims: "Ø 28 × 9.5 cm · ≈ 1.4 kg", guidance: "Small to medium dogs, approx. 5–20 kg (proposed)" },
  large: { dims: "Ø 34 × 11 cm · ≈ 2.1 kg", guidance: "Medium to large dogs, approx. 15–40 kg (proposed)" },
};

const LEVEL_COPY: Record<1 | 2 | 3, string> = {
  1: "Gentle start — Open Cup and Ridge Field first",
  2: "Curious start — begin at Pillar Maze",
  3: "Clever start — Lift Flap, Tilt Dome and Deep Well up front",
};

function useLiveAvailability(variants: PublicVariant[]) {
  const [live, setLive] = useState<Record<string, Pick<PublicVariant, "stockStatus" | "lowStockCount" | "maxQuantity">>>({});
  useEffect(() => {
    if (!variants.length) return;
    const ctrl = new AbortController();
    fetch(`/api/inventory?variantIds=${variants.map((v) => v.id).join(",")}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (!body) return;
        const map: typeof live = {};
        for (const a of body.availability as { variantId: string; stockStatus: PublicVariant["stockStatus"]; lowStockCount: number | null; maxQuantity: number }[]) {
          map[a.variantId] = { stockStatus: a.stockStatus, lowStockCount: a.lowStockCount, maxQuantity: a.maxQuantity };
        }
        setLive(map);
      })
      .catch(() => {});
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variants.map((v) => v.id).join(",")]);
  return live;
}

export function Configurator({
  product,
  initialColor,
  initialSize,
  recommendation,
  layout = "section",
  tone = "light",
}: {
  product: PublicProduct;
  initialColor?: string;
  initialSize?: string;
  recommendation?: Recommendation | null;
  layout?: "section" | "page";
  tone?: "light" | "dark";
}) {
  const live = useLiveAvailability(product.variants);
  const variants = useMemo(() => product.variants.map((v) => ({ ...v, ...(live[v.id] ?? {}) })), [product.variants, live]);
  const colors = useMemo(() => {
    const seen = new Map<string, PublicVariant>();
    for (const v of variants) if (!seen.has(v.colorKey)) seen.set(v.colorKey, v);
    return [...seen.values()];
  }, [variants]);
  const sizes = useMemo(() => [...new Set(variants.map((v) => v.size))], [variants]);

  const [colorKey, setColorKey] = useState(() => (initialColor && colors.some((c) => c.colorKey === initialColor) ? initialColor : colors[0]?.colorKey ?? ""));
  const [size, setSize] = useState(() => recommendation?.size ?? (initialSize && sizes.includes(initialSize) ? initialSize : sizes[0] ?? "standard"));
  const [qtyChoice, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { push } = useToast();
  const { openCart } = useCartUI();

  const variant = variants.find((v) => v.colorKey === colorKey && v.size === size);
  const color = colors.find((c) => c.colorKey === colorKey) ?? colors[0];
  const soldOut = !variant || variant.stockStatus === "sold_out";
  const max = Math.max(1, variant?.maxQuantity ?? 1);

  const qty = Math.min(qtyChoice, max);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 2200);
    return () => clearTimeout(t);
  }, [added]);

  // Keep the URL shareable on the customize page.
  useEffect(() => {
    if (layout !== "page") return;
    const url = new URL(window.location.href);
    url.searchParams.set("color", colorKey);
    url.searchParams.set("size", size);
    window.history.replaceState(null, "", url.toString());
  }, [colorKey, size, layout]);

  const add = () => {
    if (!variant || soldOut) return;
    const addedQty = cartStore.add(
      {
        variantId: variant.id,
        name: `${product.name} — ${variant.colorName}`,
        colorName: variant.colorName,
        colorHex: variant.colorHex,
        accentHex: variant.accentHex,
        sizeLabel: variant.sizeLabel,
        priceCents: variant.priceCents,
        sku: variant.sku,
      },
      qty,
      variant.maxQuantity,
    );
    if (addedQty <= 0) {
      push({ tone: "info", title: "Limit reached", description: "You already have the maximum of this option in your cart." });
      openCart();
      return;
    }
    setAdded(true);
    push({ tone: "success", title: "Added to cart", description: `${variant.colorName} · ${variant.sizeLabel}${addedQty > 1 ? ` × ${addedQty}` : ""}` });
    openCart();
  };

  const dark = tone === "dark";

  return (
    <div className={cn("grid gap-10 lg:grid-cols-12 lg:gap-14", layout === "page" && "lg:min-h-[calc(100svh-9rem)]")}>
      <div className={cn("lg:col-span-7", layout === "page" ? "lg:sticky lg:top-24 lg:h-[calc(100svh-8rem)]" : "")}>
        <div
          className={cn(
            "relative flex flex-col overflow-hidden rounded-[var(--radius-panel)] p-3 sm:p-4",
            dark ? "bg-ivory" : "bg-sand/60",
            layout === "page" ? "h-[68svh] lg:h-full" : "h-[62svh] min-h-[420px] lg:h-[640px]",
          )}
        >
          {color && (
            <ProductViewer colorKey={color.colorKey} colorHex={color.colorHex} accentHex={color.accentHex} size={size === "large" ? "large" : "standard"} className="h-full" />
          )}
        </div>
      </div>

      <div className="flex flex-col lg:col-span-5">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className={cn("text-display-4", layout === "page" && "sr-only")}>{product.name}</h3>
          <AnimatePresence mode="popLayout">
            <motion.p
              key={variant?.priceCents ?? 0}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              className="tabular font-display text-3xl font-semibold tracking-[-0.03em]"
              aria-live="polite"
            >
              {variant ? formatMoney(variant.priceCents) : "—"}
            </motion.p>
          </AnimatePresence>
        </div>

        {recommendation && (
          <div className="mt-6 flex gap-3 rounded-2xl bg-mint/60 p-4 text-sm text-forest">
            <Check size={18} className="mt-0.5 shrink-0" />
            <p>
              <strong className="font-semibold">Your Dog Match:</strong> {recommendation.size === "large" ? "Large" : "Standard"} size ·{" "}
              {LEVEL_COPY[recommendation.level]}.{recommendation.reason ? ` ${recommendation.reason}` : ""}
            </p>
          </div>
        )}

        <fieldset className="mt-8">
          <legend className="flex w-full items-baseline justify-between text-sm">
            <span className="font-medium">Colour</span>
            <span className={dark ? "text-ivory/70" : "text-graphite/65"}>
              {color ? `${color.colorName} — ${descriptionFor(color)}` : ""}
            </span>
          </legend>
          <div className="mt-4 flex flex-wrap gap-3" role="radiogroup" aria-label="Colour">
            {colors.map((c) => {
              const active = c.colorKey === colorKey;
              return (
                <button
                  key={c.colorKey}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={`${c.colorName}: ${descriptionFor(c)}`}
                  onClick={() => setColorKey(c.colorKey)}
                  className={cn(
                    "relative grid size-14 place-items-center rounded-full transition-transform duration-300 hover:scale-105",
                    active ? "ring-2 ring-forest ring-offset-4 ring-offset-ivory" : "ring-1 ring-graphite/15",
                  )}
                  style={{ background: `conic-gradient(from 200deg, ${c.colorHex} 0 72%, ${c.accentHex} 72% 100%)` }}
                >
                  {active && (
                    <motion.span layoutId="swatch-dot" className="size-2.5 rounded-full bg-forest ring-2 ring-white" />
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mt-8">
          <legend className="text-sm font-medium">Size</legend>
          <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Size">
            {sizes.map((s) => {
              const v = variants.find((x) => x.colorKey === colorKey && x.size === s);
              const active = s === size;
              const out = !v || v.stockStatus === "sold_out";
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSize(s)}
                  className={cn(
                    "relative flex flex-col items-start rounded-2xl border p-4 text-left transition-colors",
                    active ? "border-forest bg-forest text-ivory" : "border-graphite/15 bg-white/50 hover:border-graphite/40",
                  )}
                >
                  <span className="flex w-full items-center justify-between">
                    <span className="font-medium capitalize">{s}</span>
                    <span className="tabular text-sm">{v ? formatMoney(v.priceCents) : ""}</span>
                  </span>
                  <span className={cn("mt-1 text-xs", active ? "text-ivory/70" : "text-graphite/60")}>{SIZE_COPY[s]?.dims}</span>
                  <span className={cn("mt-2 text-xs", active ? "text-ivory/70" : "text-graphite/60")}>{SIZE_COPY[s]?.guidance}</span>
                  {out && <span className="absolute right-3 top-10 rounded-full bg-coral-200 px-2 py-0.5 text-[0.68rem] font-medium text-[#7a2a0d]">Sold out</span>}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-8 flex items-center gap-2 text-sm" aria-live="polite">
          {soldOut ? (
            <span className="flex items-center gap-2 text-[#a5321a]">
              <span className="size-2 rounded-full bg-[#a5321a]" /> Sold out in this combination — try another colour or size.
            </span>
          ) : variant?.stockStatus === "low_stock" ? (
            <span className="flex items-center gap-2 text-[#8a5300]">
              <span className="size-2 rounded-full bg-[#e09a1c]" /> Only {variant.lowStockCount} left (demo stock)
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#2f9e6f]" /> In stock (demo inventory)
            </span>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <QuantityStepper value={qty} max={max} onChange={setQty} disabled={soldOut} />
          <Button size="lg" onClick={add} disabled={soldOut} className="min-w-[13rem] flex-1" icon={added ? <Check size={18} /> : undefined}>
            {soldOut ? "Sold out" : added ? "Added to cart" : `Add to cart · ${variant ? formatMoney(variant.priceCents * qty) : ""}`}
          </Button>
        </div>

        <ul className={cn("mt-8 space-y-3 border-t hairline pt-6 text-sm", dark ? "text-ivory/75" : "text-graphite/70")}>
          <li className="flex gap-3">
            <Truck size={18} className="shrink-0" /> Free standard shipping on orders from $140 · demo shipping estimates only
          </li>
          <li className="flex gap-3">
            <Info size={18} className="shrink-0" /> Test-order store: checkout saves a real order record but takes no payment.
          </li>
        </ul>
      </div>
    </div>
  );
}

function descriptionFor(v: PublicVariant) {
  const map: Record<string, string> = {
    "morning-walk": "Ivory shell · coral shutter",
    "deep-woods": "Forest teal shell · mint shutter",
    "fresh-trail": "Mint shell · graphite shutter",
    "sunset-fetch": "Coral shell · cream shutter",
  };
  return map[v.colorKey] ?? v.colorName;
}
