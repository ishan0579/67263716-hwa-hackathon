"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { TextAreaField } from "@/components/ui/field";
import type { OrderStatus } from "@/server/db/schema";
import { cn } from "@/lib/utils";
import { adminRequest, toAdminError } from "./api";
import { OrderStatusPill } from "./badges";
import { ConfirmDialog } from "./confirm-dialog";
import { InlineAlert } from "./ui";
import { useAdminFeedback } from "./use-admin-feedback";

const EFFECTS: Partial<Record<OrderStatus, string>> = {
  confirmed: "Confirm the order.",
  processing: "Start preparing the order for shipment.",
  shipped: "Mark the parcel as handed to the carrier.",
  delivered: "Confirm the order has arrived. This is final.",
};

export function OrderStatusForm({
  orderId,
  orderNumber,
  currentStatus,
  currentLabel,
  options,
  unitCount,
}: {
  orderId: string;
  orderNumber: string;
  currentStatus: OrderStatus;
  currentLabel: string;
  options: { value: OrderStatus; label: string }[];
  unitCount: number;
}) {
  const { fail, success, router } = useAdminFeedback();
  const groupId = useId();
  const [choice, setChoice] = useState<OrderStatus | "">(options[0]?.value ?? "");
  // The form stays mounted across router.refresh() (so inline errors survive);
  // fall back to the first allowed option when the server changes the choices.
  const next: OrderStatus | "" = options.some((o) => o.value === choice) ? choice : (options[0]?.value ?? "");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | undefined>();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (options.length === 0) {
    return (
      <p className="p-4 text-sm leading-relaxed text-graphite/70 sm:p-5">
        This order is <strong className="font-medium text-graphite">{currentLabel}</strong>. No further status changes are possible.
      </p>
    );
  }

  const cancelEffect =
    currentStatus === "pending_payment"
      ? "Cancel the order and release its reserved stock."
      : "Cancel the order and return its items to stock.";

  async function perform() {
    if (!next) return;
    setPending(true);
    setError(null);
    setNoteError(undefined);
    try {
      await adminRequest(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        body: { status: next, note: note.trim() || undefined },
      });
      const label = options.find((o) => o.value === next)?.label ?? next;
      success(`Order ${orderNumber} updated`, `Status is now “${label}”.`);
      setConfirmOpen(false);
      setNote("");
      router.refresh();
    } catch (err) {
      const e = toAdminError(err);
      setConfirmOpen(false);
      if (e.status === 422 && e.fieldErrors?.note) setNoteError(e.fieldErrors.note);
      setError(e.status === 409 ? `${e.message} The page has been refreshed with the latest status.` : e.message);
      fail(e, e.status === 409 ? "Status change not allowed" : "Couldn't update the status");
      if (e.status === 409) router.refresh();
    } finally {
      setPending(false);
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!next || pending) return;
    if (note.trim().length > 500) {
      setNoteError("Keep the note under 500 characters.");
      return;
    }
    if (next === "cancelled") setConfirmOpen(true);
    else void perform();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5 p-4 sm:p-5" noValidate>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-graphite">
          Move from <span className="text-forest">{currentLabel}</span> to…
        </legend>
        {options.map((o) => {
          const id = `${groupId}-${o.value}`;
          const checked = next === o.value;
          return (
            <label
              key={o.value}
              htmlFor={id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors",
                checked ? "border-forest bg-mint/30" : "border-graphite/15 bg-white hover:border-forest/40",
                "has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-mint/70",
              )}
            >
              <input
                id={id}
                type="radio"
                name="status"
                value={o.value}
                checked={checked}
                onChange={() => setChoice(o.value)}
                disabled={pending}
                className="mt-1 size-4 shrink-0 accent-forest"
              />
              <span className="flex min-w-0 flex-col gap-1.5">
                <OrderStatusPill status={o.value} label={o.label} className="self-start" />
                <span className="text-sm leading-snug text-graphite/70">{o.value === "cancelled" ? cancelEffect : EFFECTS[o.value]}</span>
              </span>
            </label>
          );
        })}
      </fieldset>

      <TextAreaField
        label="Internal note"
        optional
        hint="Saved to the status history. Not shown to the customer."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
        error={noteError}
        disabled={pending}
        className="[&_textarea]:min-h-24"
      />

      <div aria-live="polite">{error && <InlineAlert title="The status wasn't changed">{error}</InlineAlert>}</div>

      <Button type="submit" variant={next === "cancelled" ? "primary" : "dark"} size="sm" loading={pending && !confirmOpen} disabled={!next} className="self-start">
        {next === "cancelled" ? "Cancel order…" : "Update status"}
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        title={`Cancel order ${orderNumber}?`}
        confirmLabel="Yes, cancel order"
        cancelLabel="Keep order"
        pending={pending}
        onConfirm={() => void perform()}
        onClose={() => setConfirmOpen(false)}
      >
        <p>
          {currentStatus === "pending_payment"
            ? `This releases the ${unitCount} reserved unit${unitCount === 1 ? "" : "s"} back to available stock`
            : `This returns ${unitCount} unit${unitCount === 1 ? "" : "s"} to inventory`}{" "}
          and records the change in the order history. Cancelled orders can&apos;t be reopened.
        </p>
      </ConfirmDialog>
    </form>
  );
}
