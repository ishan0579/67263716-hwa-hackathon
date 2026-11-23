"use client";

import { AnimatePresence } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useCartQuote } from "@/lib/cart/use-quote";
import { formatMoney } from "@/lib/money";
import { ButtonLink } from "../ui/button";
import { Close, Truck } from "../ui/icons";
import { Sheet } from "../ui/sheet";
import { Skeleton } from "../ui/spinner";
import { useCartUI } from "./cart-ui";
import { CartLineRow } from "./cart-line";
import { EmptyCart } from "./empty-cart";

export function CartDrawer() {
  const { open, closeCart } = useCartUI();
  const pathname = usePathname();
  const { lines, quote, loading, error } = useCartQuote("standard", open);

  useEffect(() => closeCart(), [pathname, closeCart]);

  const subtotal = quote?.subtotalCents ?? lines.reduce((s, l) => s + l.priceCents * l.quantity, 0);
  const standard = quote?.shippingOptions.find((o) => o.id === "standard");
  const freeAt = standard?.freeOverCents ?? null;
  const remaining = freeAt !== null ? Math.max(0, freeAt - subtotal) : null;
  const count = lines.reduce((s, l) => s + l.quantity, 0);

  return (
    <Sheet open={open} onClose={closeCart} side="right" label="Shopping cart" className="flex flex-col bg-ivory text-graphite shadow-2xl">
      <div className="flex items-center justify-between border-b hairline px-6 py-5">
        <h2 className="font-display text-2xl font-semibold tracking-[-0.03em]">
          Your cart{" "}
          <span className="tabular align-super text-sm font-medium text-graphite/50">{count > 0 ? count : ""}</span>
        </h2>
        <button type="button" onClick={closeCart} className="grid size-10 place-items-center rounded-full hover:bg-graphite/[0.06]" aria-label="Close cart" autoFocus>
          <Close size={22} />
        </button>
      </div>

      {lines.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <EmptyCart onNavigate={closeCart} />
        </div>
      ) : (
        <>
          {remaining !== null && (
            <div className="border-b hairline px-6 py-4">
              <p className="flex items-center gap-2 text-sm">
                <Truck size={18} className="text-forest" />
                {remaining > 0 ? (
                  <span>
                    Add <strong className="tabular">{formatMoney(remaining)}</strong> for free standard shipping
                  </span>
                ) : (
                  <span>Free standard shipping unlocked</span>
                )}
              </p>
              <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-graphite/10">
                <div
                  className="h-full rounded-full bg-forest transition-[width] duration-700 ease-[var(--ease-out-expo)]"
                  style={{ width: `${freeAt ? Math.min(100, (subtotal / freeAt) * 100) : 100}%` }}
                />
              </div>
            </div>
          )}
          <ul className="flex-1 divide-y hairline overflow-y-auto px-6" aria-busy={loading}>
            <AnimatePresence initial={false}>
              {lines.map((l) => (
                <CartLineRow key={l.variantId} line={l} quoted={quote?.lines.find((q) => q.variantId === l.variantId)} compact />
              ))}
            </AnimatePresence>
          </ul>
          <div className="border-t hairline bg-cream px-6 pb-6 pt-5">
            {error && (
              <p role="alert" className="mb-3 text-sm text-[#a5321a]">
                {error}
              </p>
            )}
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-graphite/70">Subtotal</dt>
                <dd className="tabular font-medium">{loading && !quote ? <Skeleton className="h-4 w-16" /> : formatMoney(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-graphite/70">Shipping</dt>
                <dd className="text-graphite/70">Calculated at checkout</dd>
              </div>
            </dl>
            <div className="mt-5 flex flex-col gap-2.5">
              <ButtonLink href="/checkout" size="lg" arrow className="w-full" aria-disabled={quote ? !quote.valid : undefined}>
                Checkout · {formatMoney(subtotal)}
              </ButtonLink>
              <Link href="/cart" className="py-2 text-center text-sm font-medium underline-offset-4 hover:underline">
                View full cart
              </Link>
            </div>
            <p className="mt-2 text-center text-xs text-graphite/55">Demonstration store — no payment is taken.</p>
          </div>
        </>
      )}
    </Sheet>
  );
}
