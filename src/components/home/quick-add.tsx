"use client";

import { useState } from "react";
import type { PublicVariant } from "@/server/services/catalog";
import { cartStore } from "@/lib/cart/store";
import { useCartUI } from "../cart/cart-ui";
import { Button } from "../ui/button";
import { Bag } from "../ui/icons";
import { useToast } from "../ui/toast";

/** One-click add of the default variant (used in the final CTA). */
export function QuickAdd({ variant, productName }: { variant: PublicVariant; productName: string }) {
  const { openCart } = useCartUI();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const soldOut = variant.stockStatus === "sold_out";

  return (
    <Button
      size="lg"
      variant="outline"
      icon={<Bag size={18} />}
      disabled={soldOut || busy}
      onClick={() => {
        setBusy(true);
        const n = cartStore.add(
          {
            variantId: variant.id,
            name: `${productName} — ${variant.colorName}`,
            colorName: variant.colorName,
            colorHex: variant.colorHex,
            accentHex: variant.accentHex,
            sizeLabel: variant.sizeLabel,
            priceCents: variant.priceCents,
            sku: variant.sku,
          },
          1,
          variant.maxQuantity,
        );
        push(
          n > 0
            ? { tone: "success", title: "Added to cart", description: `${variant.colorName} · ${variant.sizeLabel}` }
            : { tone: "info", title: "Limit reached", description: "You already have the maximum of this option." },
        );
        openCart();
        setBusy(false);
      }}
    >
      {soldOut ? "Sold out" : `Add ${variant.colorName}`}
    </Button>
  );
}
