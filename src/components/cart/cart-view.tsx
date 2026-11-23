"use client";

import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { useHydrated } from "@/hooks/use-client";
import { cartStore } from "@/lib/cart/store";
import { useCartQuote } from "@/lib/cart/use-quote";
import type { ShippingMethodId } from "@/lib/validation/checkout";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { ButtonLink, TextLink } from "../ui/button";
import { Alert, ArrowLeft } from "../ui/icons";
import { Breadcrumbs, ConceptNotice } from "../ui/misc";
import { Skeleton } from "../ui/spinner";
import { CartLineRow } from "./cart-line";
import { EmptyCart } from "./empty-cart";
import { SummaryRows } from "./order-summary";

export function CartView() {
  const [method, setMethod] = useState<ShippingMethodId>("standard");
  const { lines, quote, loading, error, refresh } = useCartQuote(method);
  const hydrated = useHydrated();

  const issues = quote?.lines.filter((l) => l.issue) ?? [];

  return (
    <section data-nav="light" className="min-h-[80svh] bg-ivory pb-24 pt-28 text-forest sm:pt-32">
      <div className="container-x">
        <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "Cart" }]} />
        <h1 className="text-display-3 mt-6">Your cart</h1>

        {!hydrated ? (
          <div className="mt-12 grid gap-10 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-7">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
            <Skeleton className="h-64 w-full lg:col-span-4 lg:col-start-9" />
          </div>
        ) : lines.length === 0 ? (
          <div className="grid min-h-[50svh] place-items-center">
            <EmptyCart />
          </div>
        ) : (
          <div className="mt-12 grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              {issues.length > 0 && (
                <div role="alert" className="mb-6 flex gap-3 rounded-2xl bg-coral-200/70 p-4 text-sm text-[#6b230b]">
                  <Alert size={18} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Some items need attention before checkout.</p>
                    <p className="mt-1">Stock or availability changed. Adjust quantities or remove the affected items.</p>
                    <button
                      type="button"
                      className="mt-2 font-medium underline underline-offset-4"
                      onClick={() => {
                        for (const l of issues) {
                          if (l.maxQuantity <= 0) cartStore.remove(l.variantId);
                          else cartStore.setQuantity(l.variantId, l.maxQuantity);
                        }
                      }}
                    >
                      Fix automatically
                    </button>
                  </div>
                </div>
              )}
              <ul className="divide-y hairline border-y hairline">
                <AnimatePresence initial={false}>
                  {lines.map((l) => (
                    <CartLineRow key={l.variantId} line={l} quoted={quote?.lines.find((q) => q.variantId === l.variantId)} />
                  ))}
                </AnimatePresence>
              </ul>
              <div className="mt-6 flex items-center justify-between">
                <TextLink href="/customize">
                  <ArrowLeft size={16} /> Continue shopping
                </TextLink>
                <button type="button" onClick={() => cartStore.clear()} className="text-sm text-graphite/60 underline-offset-4 hover:underline">
                  Empty cart
                </button>
              </div>
            </div>

            <aside aria-label="Order summary" className="lg:col-span-4 lg:col-start-9">
              <div className="rounded-[var(--radius-panel)] bg-white/70 p-6 ring-1 ring-graphite/10 lg:sticky lg:top-28">
                <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">Summary</h2>
                <fieldset className="mt-6">
                  <legend className="text-sm font-medium">Shipping estimate</legend>
                  <div className="mt-3 space-y-2">
                    {(quote?.shippingOptions ?? []).map((o) => (
                      <label
                        key={o.id}
                        className={cn(
                          "flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 text-sm transition-colors",
                          method === o.id ? "border-forest bg-forest/[0.03]" : "border-graphite/15 hover:border-graphite/35",
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <input type="radio" name="ship" value={o.id} checked={method === o.id} onChange={() => setMethod(o.id)} className="accent-forest" />
                          <span>
                            <span className="font-medium">{o.label}</span>
                            <span className="block text-xs text-graphite/60">{o.description}</span>
                          </span>
                        </span>
                        <span className="tabular font-medium">{o.priceCents === 0 ? "Free" : formatMoney(o.priceCents, "USD", { exact: true })}</span>
                      </label>
                    ))}
                    {!quote && <Skeleton className="h-28 w-full" />}
                  </div>
                </fieldset>
                <div className="mt-6">
                  <SummaryRows quote={quote} loading={loading} />
                </div>
                {error && (
                  <p role="alert" className="mt-4 text-sm text-[#a5321a]">
                    {error}{" "}
                    <button type="button" onClick={refresh} className="underline">
                      Retry
                    </button>
                  </p>
                )}
                <ButtonLink
                  href={`/checkout?shipping=${method}`}
                  size="lg"
                  arrow
                  className={cn("mt-6 w-full", (!quote || !quote.valid) && "pointer-events-none opacity-45")}
                  aria-disabled={!quote || !quote.valid}
                  tabIndex={!quote || !quote.valid ? -1 : undefined}
                >
                  Continue to checkout
                </ButtonLink>
                <p className="mt-3 text-center text-xs text-graphite/55">Prices and stock are confirmed by the server at checkout.</p>
              </div>
              <ConceptNotice className="mt-6" />
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
