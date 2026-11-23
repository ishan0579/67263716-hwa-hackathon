import "server-only";
import type { OrderStatus } from "@/server/db/schema";
import { STATUS_LABELS } from "@/server/services/orders";
import { OrderStatusPill } from "./badges";

/** Server-component convenience wrapper that resolves the canonical status label. */
export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return <OrderStatusPill status={status} label={STATUS_LABELS[status]} className={className} />;
}
