import { Badge } from "@/components/ui/misc";
import type { InventoryReason, OrderStatus, PaymentStatus } from "@/server/db/schema";
import { cn } from "@/lib/utils";
import { PAYMENT_STATUS_LABELS, REASON_LABELS } from "./format";

/* Client-safe status badges. Each pairs colour with a text label (never colour alone). */

type Tone = "neutral" | "mint" | "coral" | "forest" | "warning" | "muted";

function Dot() {
  return <span aria-hidden="true" className="size-1.5 rounded-full bg-current opacity-70" />;
}

export const ORDER_STATUS_STYLE: Record<OrderStatus, { tone: Tone; className?: string }> = {
  pending_payment: { tone: "warning" },
  confirmed: { tone: "mint" },
  processing: { tone: "neutral", className: "bg-aqua text-forest ring-1 ring-inset ring-forest/15" },
  shipped: { tone: "forest" },
  delivered: { tone: "neutral", className: "bg-sage/40 text-forest" },
  cancelled: { tone: "coral" },
};

/** Order status badge; the label is passed in so this stays free of server imports. */
export function OrderStatusPill({ status, label, className }: { status: OrderStatus; label: string; className?: string }) {
  const s = ORDER_STATUS_STYLE[status];
  return (
    <Badge tone={s.tone} className={cn("whitespace-nowrap", s.className, className)}>
      <Dot />
      {label}
    </Badge>
  );
}

export type StockStatus = "in_stock" | "low_stock" | "sold_out";

export function StockBadge({ status }: { status: StockStatus }) {
  const map: Record<StockStatus, { tone: Tone; label: string }> = {
    in_stock: { tone: "mint", label: "In stock" },
    low_stock: { tone: "warning", label: "Low stock" },
    sold_out: { tone: "coral", label: "Sold out" },
  };
  const m = map[status];
  return (
    <Badge tone={m.tone} className="whitespace-nowrap">
      <Dot />
      {m.label}
    </Badge>
  );
}

export function ActiveBadge({ active, activeLabel = "Active", inactiveLabel = "Inactive" }: { active: boolean; activeLabel?: string; inactiveLabel?: string }) {
  return (
    <Badge tone={active ? "mint" : "muted"} className="whitespace-nowrap">
      <Dot />
      {active ? activeLabel : inactiveLabel}
    </Badge>
  );
}

export function ContactStatusBadge({ status }: { status: "new" | "read" | "archived" }) {
  const map = {
    new: { tone: "forest" as Tone, label: "New" },
    read: { tone: "neutral" as Tone, label: "Read" },
    archived: { tone: "muted" as Tone, label: "Archived" },
  };
  const m = map[status];
  return (
    <Badge tone={m.tone} className="whitespace-nowrap">
      {m.label}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const tones: Record<PaymentStatus, Tone> = {
    not_charged: "neutral",
    pending: "warning",
    succeeded: "mint",
    failed: "coral",
    expired: "muted",
    refunded: "neutral",
  };
  return (
    <Badge tone={tones[status]} className="whitespace-nowrap">
      {PAYMENT_STATUS_LABELS[status]}
    </Badge>
  );
}

export function ReasonBadge({ reason }: { reason: InventoryReason }) {
  const tones: Record<InventoryReason, Tone> = {
    initial_stock: "muted",
    restock: "mint",
    adjustment: "neutral",
    sale: "forest",
    reservation: "warning",
    reservation_release: "neutral",
    reservation_commit: "forest",
    cancellation_restock: "coral",
  };
  return (
    <Badge tone={tones[reason]} className="whitespace-nowrap">
      {REASON_LABELS[reason]}
    </Badge>
  );
}
