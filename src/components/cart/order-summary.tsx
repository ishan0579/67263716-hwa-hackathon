"use client";

import type { QuoteResponse } from "@/lib/cart/use-quote";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Skeleton } from "../ui/spinner";

export function SummaryRows({ quote, loading, tone = "light" }: { quote: QuoteResponse | null; loading: boolean; tone?: "light" | "dark" }) {
  const muted = tone === "dark" ? "text-ivory/65" : "text-graphite/65";
  const row = (label: string, value: React.ReactNode, strong = false) => (
    <div className={cn("flex items-baseline justify-between gap-4", strong && "pt-3 text-lg font-semibold")}>
      <dt className={strong ? "" : muted}>{label}</dt>
      <dd className="tabular">{loading && !quote ? <Skeleton className="h-4 w-16" /> : value}</dd>
    </div>
  );
  const method = quote?.shippingOptions.find((o) => o.id === quote.shippingMethod);
  return (
    <dl className="space-y-2 text-[0.95rem]">
      {row("Subtotal", quote ? formatMoney(quote.subtotalCents, quote.currency, { exact: true }) : "—")}
      {row(
        `Shipping${method ? ` · ${method.label}` : ""}`,
        quote ? (quote.shippingCents === 0 ? "Free" : formatMoney(quote.shippingCents, quote.currency, { exact: true })) : "—",
      )}
      {row("Tax", "Not collected (demo)")}
      <div className="border-t hairline" />
      {row("Total", quote ? formatMoney(quote.totalCents, quote.currency, { exact: true }) : "—", true)}
    </dl>
  );
}
