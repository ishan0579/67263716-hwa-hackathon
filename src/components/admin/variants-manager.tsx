"use client";

import { Fragment, useId, useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { ProductThumb } from "@/components/cart/product-thumb";
import { Button } from "@/components/ui/button";
import { Close, Plus } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { variantInputSchema, variantUpdateSchema } from "@/lib/validation/admin";
import { adminRequest, issuesToFieldErrors, toAdminError, type FieldErrors } from "./api";
import { centsToDollars, dollarsToCents, parseWhole, slugify } from "./format";
import { BoxIcon, PencilIcon } from "./icons";
import { EmptyState, InlineAlert, inputClass, Panel, Swatch, TableScroll, tableClass, tdClass, theadClass, thClass, trClass } from "./ui";
import { useAdminFeedback } from "./use-admin-feedback";

export type AdminVariant = {
  id: string;
  sku: string;
  name: string;
  colorKey: string;
  colorName: string;
  colorHex: string;
  accentHex: string;
  size: string;
  sizeLabel: string;
  priceCents: number;
  isActive: boolean;
  sortOrder: number;
  onHand: number;
  reserved: number;
  lowStockThreshold: number;
};

const COLS = 8;

export function VariantsManager({ productId, variants }: { productId: string; variants: AdminVariant[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(variants.length === 0);
  const addId = useId();

  return (
    <Panel
      id="variants"
      title="Variants"
      description="Colour and size options. Prices are per unit; stock is managed on the Inventory page."
      actions={
        <Button
          variant={addOpen ? "outline" : "dark"}
          size="sm"
          className={addOpen ? "text-forest" : undefined}
          icon={addOpen ? <Close size={16} /> : <Plus size={16} />}
          aria-expanded={addOpen}
          aria-controls={addId}
          onClick={() => setAddOpen((o) => !o)}
        >
          {addOpen ? "Close form" : "Add variant"}
        </Button>
      }
    >
      {addOpen && (
        <div id={addId} className="border-b border-graphite/[0.08] bg-ivory/60">
          <AddVariantForm
            productId={productId}
            nextSortOrder={variants.reduce((m, v) => Math.max(m, v.sortOrder + 1), 0)}
            defaultPrice={variants[0]?.priceCents}
            onDone={() => setAddOpen(false)}
          />
        </div>
      )}
      {variants.length === 0 ? (
        <EmptyState icon={<BoxIcon size={20} />} title="No variants yet" description="Add at least one active variant so customers can order this product." />
      ) : (
        <TableScroll label="Variants">
          <table className={`${tableClass} min-w-[58rem]`}>
            <thead className={theadClass}>
              <tr>
                <th scope="col" className={thClass}>Variant</th>
                <th scope="col" className={thClass}>Colour</th>
                <th scope="col" className={thClass}>Size</th>
                <th scope="col" className={`${thClass} text-right`}>Price</th>
                <th scope="col" className={`${thClass} text-right`}>On hand / reserved</th>
                <th scope="col" className={`${thClass} text-right`}>Sort</th>
                <th scope="col" className={thClass}>Active</th>
                <th scope="col" className={`${thClass} text-right`}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => {
                const editing = editingId === v.id;
                const editRowId = `edit-${v.id}`;
                return (
                  <Fragment key={v.id}>
                    <tr className={cn(trClass, editing ? "bg-mint/20" : "hover:bg-sand/25", !v.isActive && !editing && "text-graphite/60")}>
                      <th scope="row" className={`${tdClass} font-normal`}>
                        <div className="flex items-center gap-3">
                          <span className={cn("grid h-11 w-14 shrink-0 place-items-center rounded-lg bg-sand/50", !v.isActive && "opacity-60")}>
                            <ProductThumb colorHex={v.colorHex} accentHex={v.accentHex} className="h-9 w-11" />
                          </span>
                          <span className="min-w-0">
                            <span className="block whitespace-nowrap font-medium text-graphite">{v.name}</span>
                            <span className="block font-mono text-xs text-graphite/60">{v.sku}</span>
                          </span>
                        </div>
                      </th>
                      <td className={tdClass}>
                        <span className="flex items-center gap-2">
                          <span className="flex -space-x-1">
                            <Swatch hex={v.colorHex} className="size-4" />
                            <Swatch hex={v.accentHex} className="size-4" />
                          </span>
                          <span className="whitespace-nowrap">{v.colorName}</span>
                        </span>
                      </td>
                      <td className={`${tdClass} whitespace-nowrap`}>{v.sizeLabel}</td>
                      <td className={`${tdClass} tabular whitespace-nowrap text-right font-medium`}>{formatMoney(v.priceCents, "USD", { exact: true })}</td>
                      <td className={`${tdClass} tabular whitespace-nowrap text-right`}>
                        {v.onHand} <span className="text-graphite/40">/</span> {v.reserved}
                      </td>
                      <td className={`${tdClass} tabular text-right`}>{v.sortOrder}</td>
                      <td className={tdClass}>
                        <ActiveSwitch variant={v} />
                      </td>
                      <td className={`${tdClass} text-right`}>
                        <button
                          type="button"
                          onClick={() => setEditingId(editing ? null : v.id)}
                          aria-expanded={editing}
                          aria-controls={editing ? editRowId : undefined}
                          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-graphite/15 px-3.5 text-sm font-medium text-forest transition-colors hover:border-forest/40 hover:bg-forest/[0.04]"
                        >
                          {editing ? <Close size={15} /> : <PencilIcon size={15} />}
                          {editing ? "Close" : "Edit"}
                          <span className="sr-only"> {v.name}</span>
                        </button>
                      </td>
                    </tr>
                    {editing && (
                      <tr id={editRowId} className="bg-mint/10">
                        <td colSpan={COLS} className="border-t border-forest/10 px-4 py-5 sm:px-5">
                          <VariantEditForm variant={v} onClose={() => setEditingId(null)} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </TableScroll>
      )}
    </Panel>
  );
}

/* ───────────────────────── Active switch ───────────────────────── */

function ActiveSwitch({ variant }: { variant: AdminVariant }) {
  const { fail, success, refresh, refreshing } = useAdminFeedback();
  const [target, setTarget] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = saving || refreshing;
  const checked = busy && target !== null ? target : variant.isActive;

  async function toggle() {
    const next = !variant.isActive;
    setTarget(next);
    setSaving(true);
    try {
      await adminRequest(`/api/admin/variants/${variant.id}`, { method: "PATCH", body: { isActive: next } });
      success(next ? "Variant activated" : "Variant deactivated", `${variant.name} is ${next ? "now available to order" : "hidden from the store"}.`);
      refresh();
    } catch (err) {
      setTarget(null);
      fail(err, "Couldn't update the variant");
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`${variant.name} active`}
      onClick={toggle}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-full text-sm disabled:cursor-wait"
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-forest" : "bg-graphite/25",
        )}
      >
        <span
          className={cn(
            "grid size-5 place-items-center rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[1.375rem]" : "translate-x-0.5",
          )}
        >
          {busy && <Spinner className="size-3 text-forest" />}
        </span>
      </span>
      <span className={checked ? "text-forest" : "text-graphite/60"}>{checked ? "Active" : "Inactive"}</span>
    </button>
  );
}

/* ───────────────────────── Shared fields ───────────────────────── */

function CompactField({
  label,
  error,
  hint,
  className,
  id: idProp,
  ...input
}: { label: string; error?: string; hint?: ReactNode; className?: string } & ComponentProps<"input">) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-graphite">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        className={cn(inputClass, "h-10")}
        {...input}
      />
      {error ? (
        <p id={`${id}-err`} role="alert" className="text-xs text-[#a5321a]">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-graphite/55">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function ColorField({ label, value, onChange, error, disabled }: { label: string; value: string; onChange: (v: string) => void; error?: string; disabled?: boolean }) {
  const id = useId();
  const valid = /^#[0-9a-f]{6}$/i.test(value);
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-graphite">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} colour picker`}
          value={valid ? value.toLowerCase() : "#000000"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          disabled={disabled}
          className="h-10 w-11 shrink-0 cursor-pointer rounded-lg border border-graphite/15 bg-white p-1"
        />
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
          maxLength={7}
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          disabled={disabled}
          className={cn(inputClass, "h-10 font-mono uppercase")}
        />
      </div>
      {error && (
        <p id={`${id}-err`} role="alert" className="text-xs text-[#a5321a]">
          {error}
        </p>
      )}
    </div>
  );
}

/* ───────────────────────── Inline edit ───────────────────────── */

type EditDraft = {
  name: string;
  sku: string;
  price: string;
  sortOrder: string;
  colorName: string;
  colorKey: string;
  colorHex: string;
  accentHex: string;
  size: string;
  sizeLabel: string;
};

function VariantEditForm({ variant, onClose }: { variant: AdminVariant; onClose: () => void }) {
  const { fail, success, refresh, refreshing } = useAdminFeedback();
  const [d, setD] = useState<EditDraft>({
    name: variant.name,
    sku: variant.sku,
    price: centsToDollars(variant.priceCents),
    sortOrder: String(variant.sortOrder),
    colorName: variant.colorName,
    colorKey: variant.colorKey,
    colorHex: variant.colorHex.toUpperCase(),
    accentHex: variant.accentHex.toUpperCase(),
    size: variant.size,
    sizeLabel: variant.sizeLabel,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = saving || refreshing;

  const set = (k: keyof EditDraft) => (v: string) => setD((x) => ({ ...x, [k]: v }));

  const priceCents = dollarsToCents(d.price);
  const sortOrder = parseWhole(d.sortOrder);

  // Only send fields that actually changed.
  const changes: Record<string, string | number> = {};
  if (d.name.trim() !== variant.name) changes.name = d.name;
  if (d.sku.trim().toUpperCase() !== variant.sku) changes.sku = d.sku;
  if (priceCents !== variant.priceCents) changes.priceCents = priceCents ?? NaN;
  if (sortOrder !== variant.sortOrder) changes.sortOrder = sortOrder ?? NaN;
  if (d.colorName.trim() !== variant.colorName) changes.colorName = d.colorName;
  if (d.colorKey.trim() !== variant.colorKey) changes.colorKey = d.colorKey;
  if (d.colorHex.toUpperCase() !== variant.colorHex.toUpperCase()) changes.colorHex = d.colorHex;
  if (d.accentHex.toUpperCase() !== variant.accentHex.toUpperCase()) changes.accentHex = d.accentHex;
  if (d.size.trim() !== variant.size) changes.size = d.size;
  if (d.sizeLabel.trim() !== variant.sizeLabel) changes.sizeLabel = d.sizeLabel;
  const changed = Object.keys(changes).length > 0;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const local: FieldErrors = {};
    if (priceCents === null) local.priceCents = "Enter a price in dollars, e.g. 129 or 129.50";
    if (sortOrder === null) local.sortOrder = "Enter a whole number";
    const parsed = variantUpdateSchema.safeParse(changes);
    const fe = { ...(parsed.success ? {} : issuesToFieldErrors(parsed.error.issues)), ...local };
    if (Object.keys(fe).length) {
      setErrors(fe);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await adminRequest(`/api/admin/variants/${variant.id}`, { method: "PATCH", body: changes });
      success("Variant saved", `${d.name.trim() || variant.name} has been updated.`);
      refresh();
      onClose();
    } catch (err) {
      const ae = toAdminError(err);
      if (ae.fieldErrors) setErrors(ae.fieldErrors);
      setFormError(ae.message);
      fail(ae, "Couldn't save the variant");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-label={`Edit ${variant.name}`} className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="grid h-14 w-16 shrink-0 place-items-center rounded-xl bg-white">
          <ProductThumb
            colorHex={/^#[0-9a-f]{6}$/i.test(d.colorHex) ? d.colorHex : variant.colorHex}
            accentHex={/^#[0-9a-f]{6}$/i.test(d.accentHex) ? d.accentHex : variant.accentHex}
            className="h-12 w-14"
          />
        </span>
        <div>
          <p className="font-display text-base font-semibold text-forest">Edit variant</p>
          <p className="text-xs text-graphite/60">Changes apply to new orders. Existing orders keep their original details.</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CompactField label="Name" value={d.name} onChange={(e) => set("name")(e.target.value)} error={errors.name} maxLength={160} disabled={busy} className="sm:col-span-2" />
        <CompactField label="SKU" value={d.sku} onChange={(e) => set("sku")(e.target.value.toUpperCase())} error={errors.sku} maxLength={64} spellCheck={false} disabled={busy} className="[&_input]:font-mono" />
        <CompactField label="Price (USD)" value={d.price} onChange={(e) => set("price")(e.target.value)} error={errors.priceCents} inputMode="decimal" hint={priceCents !== null ? `${priceCents.toLocaleString("en-US")} cents` : undefined} disabled={busy} />
        <CompactField label="Colour name" value={d.colorName} onChange={(e) => set("colorName")(e.target.value)} error={errors.colorName} maxLength={80} disabled={busy} />
        <CompactField label="Colour key" value={d.colorKey} onChange={(e) => set("colorKey")(e.target.value.toLowerCase())} error={errors.colorKey} maxLength={40} spellCheck={false} disabled={busy} className="[&_input]:font-mono" />
        <ColorField label="Shell colour" value={d.colorHex} onChange={set("colorHex")} error={errors.colorHex} disabled={busy} />
        <ColorField label="Accent colour" value={d.accentHex} onChange={set("accentHex")} error={errors.accentHex} disabled={busy} />
        <CompactField label="Size key" value={d.size} onChange={(e) => set("size")(e.target.value.toLowerCase())} error={errors.size} maxLength={20} spellCheck={false} disabled={busy} className="[&_input]:font-mono" />
        <CompactField label="Size label" value={d.sizeLabel} onChange={(e) => set("sizeLabel")(e.target.value)} error={errors.sizeLabel} maxLength={80} disabled={busy} />
        <CompactField label="Sort order" value={d.sortOrder} onChange={(e) => set("sortOrder")(e.target.value)} error={errors.sortOrder} inputMode="numeric" hint="Lower numbers show first" disabled={busy} />
      </div>
      <div aria-live="polite">{formError && <InlineAlert title="The variant wasn't saved">{formError}</InlineAlert>}</div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="dark" size="sm" loading={busy} disabled={!changed}>
          Save variant
        </Button>
        <Button variant="ghost" size="sm" className="text-forest" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        {!changed && <span className="text-xs text-graphite/55">No changes yet</span>}
      </div>
    </form>
  );
}

/* ───────────────────────── Add variant ───────────────────────── */

type AddDraft = {
  sku: string;
  name: string;
  colorName: string;
  colorKey: string;
  colorHex: string;
  accentHex: string;
  size: string;
  sizeLabel: string;
  price: string;
  initialStock: string;
  lowStockThreshold: string;
  sortOrder: string;
  isActive: boolean;
};

function AddVariantForm({
  productId,
  nextSortOrder,
  defaultPrice,
  onDone,
}: {
  productId: string;
  nextSortOrder: number;
  defaultPrice?: number;
  onDone: () => void;
}) {
  const { fail, success, refresh, refreshing } = useAdminFeedback();
  const fresh = (): AddDraft => ({
    sku: "",
    name: "",
    colorName: "",
    colorKey: "",
    colorHex: "#0C3438",
    accentHex: "#FF794B",
    size: "standard",
    sizeLabel: "Standard",
    price: defaultPrice !== undefined ? centsToDollars(defaultPrice) : "",
    initialStock: "0",
    lowStockThreshold: "5",
    sortOrder: String(nextSortOrder),
    isActive: true,
  });
  const [d, setD] = useState<AddDraft>(fresh);
  const [touched, setTouched] = useState({ name: false, colorKey: false });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = saving || refreshing;

  function update(patch: Partial<AddDraft>) {
    setD((x) => {
      const n = { ...x, ...patch };
      if (!touched.colorKey && patch.colorName !== undefined) n.colorKey = slugify(n.colorName, 40);
      if (!touched.name && (patch.colorName !== undefined || patch.sizeLabel !== undefined)) {
        n.name = n.colorName.trim() && n.sizeLabel.trim() ? `${n.colorName.trim()} · ${n.sizeLabel.trim()}` : n.colorName.trim();
      }
      return n;
    });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const local: FieldErrors = {};
    const priceCents = dollarsToCents(d.price);
    const initialStock = parseWhole(d.initialStock);
    const lowStockThreshold = parseWhole(d.lowStockThreshold);
    const sortOrder = parseWhole(d.sortOrder);
    if (priceCents === null) local.priceCents = "Enter a price in dollars, e.g. 129 or 129.50";
    if (initialStock === null) local.initialStock = "Enter a whole number";
    if (lowStockThreshold === null) local.lowStockThreshold = "Enter a whole number";
    if (sortOrder === null) local.sortOrder = "Enter a whole number";
    const body = {
      sku: d.sku,
      name: d.name,
      colorKey: d.colorKey,
      colorName: d.colorName,
      colorHex: d.colorHex,
      accentHex: d.accentHex,
      size: d.size,
      sizeLabel: d.sizeLabel,
      priceCents: priceCents ?? NaN,
      isActive: d.isActive,
      sortOrder: sortOrder ?? NaN,
      initialStock: initialStock ?? NaN,
      lowStockThreshold: lowStockThreshold ?? NaN,
    };
    const parsed = variantInputSchema.safeParse(body);
    const fe = { ...(parsed.success ? {} : issuesToFieldErrors(parsed.error.issues)), ...local };
    if (Object.keys(fe).length) {
      setErrors(fe);
      setFormError("Some details need attention — see the highlighted fields.");
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await adminRequest(`/api/admin/products/${productId}/variants`, { method: "POST", body });
      success("Variant added", `${d.name.trim()} was created with ${initialStock} in stock.`);
      setD(fresh());
      setTouched({ name: false, colorKey: false });
      refresh();
      onDone();
    } catch (err) {
      const ae = toAdminError(err);
      if (ae.fieldErrors) setErrors(ae.fieldErrors);
      else if (ae.status === 409) setErrors({ sku: ae.message });
      setFormError(ae.message);
      fail(ae, "Couldn't add the variant");
    } finally {
      setSaving(false);
    }
  }

  const colorOk = (h: string) => /^#[0-9a-f]{6}$/i.test(h);

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Add variant" className="flex flex-col gap-5 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-14 w-16 shrink-0 place-items-center rounded-xl bg-white">
          <ProductThumb colorHex={colorOk(d.colorHex) ? d.colorHex : "#0C3438"} accentHex={colorOk(d.accentHex) ? d.accentHex : "#FF794B"} className="h-12 w-14" />
        </span>
        <div>
          <p className="font-display text-base font-semibold text-forest">New variant</p>
          <p className="text-xs text-graphite/60">An inventory record and an “Initial stock” movement are created automatically.</p>
        </div>
      </div>

      <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <legend className="sr-only">Identity</legend>
        <CompactField label="Colour name" value={d.colorName} onChange={(e) => update({ colorName: e.target.value })} error={errors.colorName} maxLength={80} placeholder="Forest Mint" disabled={busy} />
        <CompactField
          label="Colour key"
          value={d.colorKey}
          onChange={(e) => {
            setTouched((t) => ({ ...t, colorKey: e.target.value !== "" }));
            update({ colorKey: e.target.value.toLowerCase() });
          }}
          error={errors.colorKey}
          hint="Lowercase, dashes; e.g. forest-mint"
          maxLength={40}
          spellCheck={false}
          className="[&_input]:font-mono"
          disabled={busy}
        />
        <CompactField label="Size key" value={d.size} onChange={(e) => update({ size: e.target.value.toLowerCase() })} error={errors.size} hint="e.g. standard, large" maxLength={20} spellCheck={false} className="[&_input]:font-mono" disabled={busy} />
        <CompactField label="Size label" value={d.sizeLabel} onChange={(e) => update({ sizeLabel: e.target.value })} error={errors.sizeLabel} maxLength={80} placeholder="Standard" disabled={busy} />
        <CompactField
          label="Variant name"
          value={d.name}
          onChange={(e) => {
            setTouched((t) => ({ ...t, name: e.target.value !== "" }));
            update({ name: e.target.value });
          }}
          error={errors.name}
          hint={!touched.name ? "Suggested from colour and size" : undefined}
          maxLength={160}
          className="sm:col-span-2"
          disabled={busy}
        />
        <CompactField
          label="SKU"
          value={d.sku}
          onChange={(e) => update({ sku: e.target.value.toUpperCase() })}
          error={errors.sku}
          hint="Letters, numbers, dashes"
          maxLength={64}
          spellCheck={false}
          placeholder="SO1-FM-STD"
          className="[&_input]:font-mono"
          disabled={busy}
        />
        <CompactField label="Price (USD)" value={d.price} onChange={(e) => update({ price: e.target.value })} error={errors.priceCents} inputMode="decimal" placeholder="129.00" disabled={busy} />
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <legend className="sr-only">Colours and stock</legend>
        <ColorField label="Shell colour" value={d.colorHex} onChange={(v) => update({ colorHex: v })} error={errors.colorHex} disabled={busy} />
        <ColorField label="Accent colour" value={d.accentHex} onChange={(v) => update({ accentHex: v })} error={errors.accentHex} disabled={busy} />
        <CompactField label="Initial stock" value={d.initialStock} onChange={(e) => update({ initialStock: e.target.value })} error={errors.initialStock} inputMode="numeric" disabled={busy} />
        <CompactField label="Low-stock threshold" value={d.lowStockThreshold} onChange={(e) => update({ lowStockThreshold: e.target.value })} error={errors.lowStockThreshold} inputMode="numeric" disabled={busy} />
        <CompactField label="Sort order" value={d.sortOrder} onChange={(e) => update({ sortOrder: e.target.value })} error={errors.sortOrder} inputMode="numeric" disabled={busy} />
        <label className="flex items-center gap-2.5 self-end pb-2 text-sm text-graphite sm:col-span-2 lg:col-span-3">
          <input type="checkbox" checked={d.isActive} onChange={(e) => update({ isActive: e.target.checked })} className="size-4 accent-forest" disabled={busy} />
          Active — available to order once the product is live
        </label>
      </fieldset>

      <div aria-live="polite">{formError && <InlineAlert title="The variant wasn't added">{formError}</InlineAlert>}</div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="dark" size="sm" loading={busy} icon={<Plus size={16} />}>
          Add variant
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-forest"
          disabled={busy}
          onClick={() => {
            setD(fresh());
            setErrors({});
            setFormError(null);
            setTouched({ name: false, colorKey: false });
            onDone();
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
