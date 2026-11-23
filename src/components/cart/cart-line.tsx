"use client";

import { motion } from "motion/react";
import { cartStore, type CartLine } from "@/lib/cart/store";
import type { QuoteLine } from "@/lib/cart/use-quote";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Alert } from "../ui/icons";
import { QuantityStepper } from "../ui/misc";
import { useToast } from "../ui/toast";
import { ProductThumb } from "./product-thumb";

export function CartLineRow({
  line,
  quoted,
  compact,
}: {
  line: CartLine;
  quoted?: QuoteLine;
  compact?: boolean;
}) {
  const { push } = useToast();
  const unit = quoted?.unitPriceCents ?? line.priceCents;
  const max = quoted ? Math.max(quoted.maxQuantity, 1) : 5;
  const issue = quoted?.issue;

  const remove = () => {
    cartStore.remove(line.variantId);
    push({
      tone: "info",
      title: "Removed from cart",
      description: `${line.name}`,
      action: { label: "Undo", onClick: () => cartStore.restore(line) },
    });
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.25 } }}
      className={cn("flex gap-4 py-5", compact ? "items-start" : "items-center")}
    >
      <div className={cn("shrink-0 rounded-2xl bg-sand/70 p-2", compact ? "size-24" : "size-28 sm:size-32")}>
        <ProductThumb colorHex={line.colorHex} accentHex={line.accentHex} className="size-full" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-medium leading-tight">{quoted?.productName ?? "SniffOrbit ONE"}</p>
            <p className="mt-1 text-sm text-graphite/65">
              {line.colorName} · {line.sizeLabel}
            </p>
          </div>
          <p className="tabular shrink-0 font-medium">{formatMoney(unit * line.quantity)}</p>
        </div>
        {issue && (
          <p className="flex items-center gap-1.5 text-sm text-[#a5321a]" role="alert">
            <Alert size={15} />
            {quoted?.message}
            {quoted && quoted.maxQuantity > 0 && issue === "insufficient_stock" && ` (max ${quoted.maxQuantity})`}
          </p>
        )}
        <div className="mt-1 flex items-center justify-between gap-3">
          <QuantityStepper
            size="sm"
            value={line.quantity}
            max={max}
            onChange={(q) => cartStore.setQuantity(line.variantId, q)}
            label={`Quantity for ${line.colorName}`}
            disabled={issue === "sold_out" || issue === "unavailable" || issue === "not_found"}
          />
          <button type="button" onClick={remove} className="text-sm text-graphite/65 underline-offset-4 hover:text-graphite hover:underline">
            Remove
          </button>
        </div>
        {!compact && <p className="tabular text-xs text-graphite/50">{formatMoney(unit)} each · SKU {line.sku}</p>}
      </div>
    </motion.li>
  );
}
