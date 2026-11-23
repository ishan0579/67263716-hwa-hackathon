"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ProductThumb } from "@/components/cart/product-thumb";
import { Button } from "@/components/ui/button";
import { SelectField, TextAreaField } from "@/components/ui/field";
import { Close } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { adminRequest, toAdminError, type FieldErrors } from "./api";
import { StockBadge, type StockStatus } from "./badges";
import { formatDelta, parseWhole } from "./format";
import { AdjustIcon } from "./icons";
import { InlineAlert, inputClass, TableScroll, tableClass, tdClass, theadClass, thClass, trClass } from "./ui";
import { useAdminFeedback } from "./use-admin-feedback";
import { useRestoreFocus } from "./use-restore-focus";

export type InventoryRow = {
  variantId: string;
  sku: string;
  name: string;
  productName: string;
  colorHex: string;
  accentHex: string;
  isActive: boolean;
  onHand: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
  status: StockStatus;
  updatedLabel: string | null;
};

export function InventoryTable({ rows }: { rows: InventoryRow[] }) {
  const [target, setTarget] = useState<InventoryRow | null>(null);

  return (
    <>
      <TableScroll label="Inventory by variant">
        <table className={`${tableClass} min-w-[60rem]`}>
          <thead className={theadClass}>
            <tr>
              <th scope="col" className={thClass}>Variant</th>
              <th scope="col" className={`${thClass} text-right`}>Available</th>
              <th scope="col" className={`${thClass} text-right`}>On hand</th>
              <th scope="col" className={`${thClass} text-right`}>Reserved</th>
              <th scope="col" className={`${thClass} text-right`}>Threshold</th>
              <th scope="col" className={thClass}>Status</th>
              <th scope="col" className={thClass}>Updated</th>
              <th scope="col" className={`${thClass} text-right`}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.variantId}
                id={`variant-${r.variantId}`}
                className={cn(
                  trClass,
                  "scroll-mt-24 target:outline target:outline-2 target:-outline-offset-2 target:outline-forest",
                  r.status === "sold_out" ? "bg-coral-200/35" : r.status === "low_stock" ? "bg-[#fde9c8]/55" : "hover:bg-sand/25",
                )}
              >
                <th scope="row" className={`${tdClass} font-normal`}>
                  <div className="flex items-center gap-3">
                    <span className={cn("grid h-11 w-14 shrink-0 place-items-center rounded-lg bg-white/70", !r.isActive && "opacity-55")}>
                      <ProductThumb colorHex={r.colorHex} accentHex={r.accentHex} className="h-9 w-11" />
                    </span>
                    <span className="min-w-0">
                      <span className="block whitespace-nowrap font-medium text-graphite">{r.name}</span>
                      <span className="block whitespace-nowrap text-xs text-graphite/60">
                        <span className="font-mono">{r.sku}</span> · {r.productName}
                        {!r.isActive && <span className="ml-1.5 rounded bg-graphite/10 px-1.5 py-px text-[0.68rem] font-medium">Inactive</span>}
                      </span>
                    </span>
                  </div>
                </th>
                <td className={`${tdClass} tabular text-right text-base font-semibold text-forest`}>{r.available}</td>
                <td className={`${tdClass} tabular text-right`}>{r.onHand}</td>
                <td className={`${tdClass} tabular text-right`}>{r.reserved}</td>
                <td className={`${tdClass} tabular text-right text-graphite/70`}>{r.lowStockThreshold}</td>
                <td className={tdClass}>
                  <StockBadge status={r.status} />
                </td>
                <td className={`${tdClass} whitespace-nowrap text-xs text-graphite/60`}>{r.updatedLabel ?? "—"}</td>
                <td className={`${tdClass} whitespace-nowrap text-right`}>
                  <div className="flex items-center justify-end gap-1.5">
                    <Link
                      href={`/admin/inventory?variant=${r.variantId}#movements`}
                      scroll={false}
                      className="inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-forest underline-offset-4 hover:underline"
                    >
                      History<span className="sr-only"> for {r.sku}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setTarget(r)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-graphite/15 bg-white px-3.5 text-sm font-medium text-forest transition-colors hover:border-forest/40 hover:bg-forest/[0.04]"
                    >
                      <AdjustIcon size={15} />
                      Adjust<span className="sr-only"> stock for {r.sku}</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>

      {/* Mounted only while open: the shared Sheet's centred variant applies `display:grid`
          to the <dialog>, which would otherwise leave an invisible click-blocking layer. */}
      {target && (
        <Sheet
          open
          onClose={() => setTarget(null)}
          side="center"
          label={`Adjust stock for ${target.sku}`}
          className="max-h-[92dvh] overflow-y-auto bg-ivory text-graphite shadow-2xl"
        >
          <AdjustForm key={target.variantId} row={target} onClose={() => setTarget(null)} />
        </Sheet>
      )}
    </>
  );
}

type Mode = "add" | "remove" | "set";

function AdjustForm({ row, onClose }: { row: InventoryRow; onClose: () => void }) {
  useRestoreFocus();
  const valueRef = useRef<HTMLInputElement>(null);
  // Focus the quantity once the dialog is open (showModal would otherwise focus the close button).
  useEffect(() => {
    const id = requestAnimationFrame(() => valueRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);
  const { fail, success, refresh, refreshing } = useAdminFeedback();
  const ids = useId();
  const [mode, setMode] = useState<Mode>("add");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState<"restock" | "adjustment">("restock");
  const [reasonTouched, setReasonTouched] = useState(false);
  const [note, setNote] = useState("");
  const [threshold, setThreshold] = useState(String(row.lowStockThreshold));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = saving || refreshing;

  const raw = value.trim();
  // An empty "set" must never mean "set to zero".
  const n = raw === "" ? (mode === "set" ? null : 0) : parseWhole(raw);
  const t = parseWhole(threshold);
  const thresholdChanged = t !== null && t !== row.lowStockThreshold;
  const delta = n === null ? null : mode === "add" ? n : mode === "remove" ? -n : n - row.onHand;
  const nextOnHand = delta === null ? null : row.onHand + delta;
  const nextAvailable = nextOnHand === null ? null : nextOnHand - row.reserved;

  let problem: string | null = null;
  if (n === null || n < 0) problem = "Enter a whole number of units (0 or more).";
  else if (t === null || t < 0) problem = "The low-stock threshold must be a whole number (0 or more).";
  else if (nextOnHand !== null && nextOnHand < 0)
    problem = `You can only remove up to the ${row.onHand} unit${row.onHand === 1 ? "" : "s"} on hand.`;
  else if (nextOnHand !== null && nextOnHand < row.reserved)
    problem = `On hand can't go below the ${row.reserved} unit${row.reserved === 1 ? "" : "s"} reserved for pending orders.`;
  else if (delta === 0 && !thresholdChanged) problem = mode === "set" ? "That's already the current on-hand count." : "Enter a quantity, or change the threshold.";

  function changeMode(m: Mode) {
    setMode(m);
    if (!reasonTouched) setReason(m === "add" ? "restock" : "adjustment");
    setFormError(null);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (problem || delta === null || t === null) {
      setFormError(problem);
      return;
    }
    setSaving(true);
    setErrors({});
    setFormError(null);
    try {
      await adminRequest("/api/admin/inventory", {
        method: "POST",
        body: {
          variantId: row.variantId,
          mode: mode === "set" ? "set" : "delta",
          value: mode === "set" ? n : delta,
          reason,
          note: note.trim() || undefined,
          ...(thresholdChanged ? { lowStockThreshold: t } : {}),
        },
      });
      const parts: string[] = [];
      if (delta !== 0) parts.push(`${formatDelta(delta)} on hand → ${nextOnHand}`);
      if (thresholdChanged) parts.push(`threshold ${t}`);
      success(`Stock updated for ${row.sku}`, parts.join(" · "));
      refresh();
      onClose();
    } catch (err) {
      const ae = toAdminError(err);
      if (ae.fieldErrors) setErrors(ae.fieldErrors);
      setFormError(ae.message);
      fail(ae, "Couldn't adjust stock");
    } finally {
      setSaving(false);
    }
  }

  const modes: { value: Mode; label: string; help: string }[] = [
    { value: "add", label: "Add stock", help: "Received units" },
    { value: "remove", label: "Remove stock", help: "Damaged, lost, samples" },
    { value: "set", label: "Set exact count", help: "After a stock take" },
  ];

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-graphite/10 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-12 w-14 shrink-0 place-items-center rounded-lg bg-white">
            <ProductThumb colorHex={row.colorHex} accentHex={row.accentHex} className="h-10 w-12" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold leading-tight tracking-tight text-forest">Adjust stock</h2>
            <p className="truncate text-sm text-graphite/65">
              {row.name} · <span className="font-mono text-xs">{row.sku}</span>
            </p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-forest/[0.07]" aria-label="Close">
          <Close size={18} />
        </button>
      </div>

      <div className="flex flex-col gap-5 px-5 py-5 sm:px-6">
        <dl className="tabular grid grid-cols-3 gap-2 rounded-xl bg-white p-3 text-center">
          {[
            ["On hand", row.onHand],
            ["Reserved", row.reserved],
            ["Available", row.available],
          ].map(([label, v]) => (
            <div key={label as string}>
              <dt className="text-xs text-graphite/60">{label}</dt>
              <dd className="font-display text-xl font-semibold text-forest">{v}</dd>
            </div>
          ))}
        </dl>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-graphite">Adjustment</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {modes.map((m) => (
              <label
                key={m.value}
                htmlFor={`${ids}-${m.value}`}
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-mint/70",
                  mode === m.value ? "border-forest bg-mint/30" : "border-graphite/15 bg-white hover:border-forest/40",
                )}
              >
                <input
                  id={`${ids}-${m.value}`}
                  type="radio"
                  name="mode"
                  value={m.value}
                  checked={mode === m.value}
                  onChange={() => changeMode(m.value)}
                  className="mt-0.5 size-4 shrink-0 accent-forest"
                  disabled={busy}
                />
                <span className="leading-tight">
                  <span className="block text-sm font-medium text-graphite">{m.label}</span>
                  <span className="block text-xs text-graphite/60">{m.help}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${ids}-value`} className="text-sm font-medium text-graphite">
              {mode === "add" ? "Units to add" : mode === "remove" ? "Units to remove" : "New on-hand count"}
            </label>
            <input
              id={`${ids}-value`}
              type="number"
              min={0}
              max={100000}
              step={1}
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-invalid={errors.value ? true : undefined}
              aria-describedby={`${ids}-preview`}
              className={cn(inputClass, "h-11 text-base tabular")}
              disabled={busy}
              ref={valueRef}
            />
            {errors.value && (
              <p role="alert" className="text-xs text-[#a5321a]">
                {errors.value}
              </p>
            )}
          </div>
          <SelectField
            label="Reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value as "restock" | "adjustment");
              setReasonTouched(true);
            }}
            error={errors.reason}
            disabled={busy}
            className="[&_select]:h-11"
          >
            <option value="restock">Restock</option>
            <option value="adjustment">Adjustment</option>
          </SelectField>
        </div>

        <p id={`${ids}-preview`} aria-live="polite" className="tabular rounded-xl border border-dashed border-graphite/20 px-3.5 py-2.5 text-sm text-graphite/75">
          {nextOnHand === null || delta === null ? (
            "Enter a quantity to preview the result."
          ) : (
            <>
              After saving: <strong className="font-medium text-forest">{nextOnHand} on hand</strong> ({formatDelta(delta)}) ·{" "}
              <strong className={cn("font-medium", nextAvailable !== null && nextAvailable < 0 ? "text-[#a5321a]" : "text-forest")}>
                {nextAvailable} available
              </strong>
            </>
          )}
        </p>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
          <TextAreaField
            label="Note"
            optional
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            error={errors.note}
            disabled={busy}
            className="[&_textarea]:min-h-20"
            placeholder="e.g. PO-1042 received"
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${ids}-threshold`} className="text-sm font-medium text-graphite">
              Low-stock at
            </label>
            <input
              id={`${ids}-threshold`}
              type="number"
              min={0}
              max={10000}
              step={1}
              inputMode="numeric"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              aria-invalid={errors.lowStockThreshold ? true : undefined}
              aria-describedby={`${ids}-threshold-hint`}
              className={cn(inputClass, "h-11 tabular")}
              disabled={busy}
            />
            <p id={`${ids}-threshold-hint`} className="text-xs text-graphite/55">
              {errors.lowStockThreshold ?? "Alert when available ≤ this"}
            </p>
          </div>
        </div>

        <div aria-live="assertive">
          {formError ? (
            <InlineAlert title="Stock wasn't changed">{formError}</InlineAlert>
          ) : problem && value.trim() !== "" ? (
            <InlineAlert tone="warning">{problem}</InlineAlert>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-graphite/10 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
        <Button variant="ghost" size="sm" className="text-forest" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="dark" size="sm" loading={busy} disabled={problem !== null}>
          Save adjustment
        </Button>
      </div>
    </form>
  );
}
