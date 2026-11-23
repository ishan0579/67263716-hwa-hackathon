"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ShippingMethodId } from "@/lib/validation/checkout";
import { cartStore, useCartLines } from "./store";

export type QuoteLine = {
  variantId: string;
  productName: string;
  productSlug: string | null;
  variantName: string;
  colorName: string;
  colorHex: string;
  accentHex: string;
  sizeLabel: string;
  sku: string;
  requestedQuantity: number;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  maxQuantity: number;
  issue: string | null;
  message: string | null;
};

export type QuoteResponse = {
  currency: string;
  lines: QuoteLine[];
  subtotalCents: number;
  shippingOptions: { id: ShippingMethodId; label: string; description: string; priceCents: number; basePriceCents: number; freeOverCents: number | null }[];
  shippingMethod: ShippingMethodId;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  valid: boolean;
  itemCount: number;
};

/**
 * Fetches an authoritative quote for the current cart (debounced) and keeps
 * the local display snapshot in sync with server names/prices.
 */
export function useCartQuote(shippingMethod: ShippingMethodId = "standard", enabled = true) {
  const lines = useCartLines();
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const key = useMemo(
    () => JSON.stringify([lines.map((l) => [l.variantId, l.quantity]), shippingMethod, nonce]),
    [lines, shippingMethod, nonce],
  );
  const reqId = useRef(0);

  useEffect(() => {
    if (!enabled || !lines.length) return;
    const id = ++reqId.current;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/cart/validate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            lines: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
            shippingMethod,
          }),
          signal: ctrl.signal,
        });
        const body = await res.json();
        if (id !== reqId.current) return;
        if (!res.ok) throw new Error(body?.error?.message ?? "Couldn't refresh your cart.");
        const q = body.quote as QuoteResponse;
        setQuote(q);
        setError(null);
        cartStore.reconcile(
          q.lines
            .filter((l) => l.issue !== "not_found")
            .map((l) => ({ variantId: l.variantId, priceCents: l.unitPriceCents, colorName: l.colorName, sizeLabel: l.sizeLabel })),
        );
      } catch (e) {
        if ((e as Error).name === "AbortError" || id !== reqId.current) return;
        setError((e as Error).message || "Couldn't refresh your cart.");
      } finally {
        if (id === reqId.current) setSettledKey(key);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  const hasLines = lines.length > 0;
  return {
    lines,
    quote: hasLines ? quote : null,
    loading: enabled && hasLines && settledKey !== key,
    error: hasLines ? error : null,
    refresh: () => setNonce((n) => n + 1),
  };
}
