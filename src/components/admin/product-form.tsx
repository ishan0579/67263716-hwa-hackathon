"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { CheckboxField, TextAreaField, TextField } from "@/components/ui/field";
import { Plus } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { productInputSchema } from "@/lib/validation/admin";
import { adminRequest, issuesToFieldErrors, toAdminError, type FieldErrors } from "./api";
import { slugify } from "./format";
import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from "./icons";
import { InlineAlert, inputClass, Panel } from "./ui";
import { useAdminFeedback } from "./use-admin-feedback";

export type ProductFormInitial = {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  conceptNotice: string;
  highlights: string[];
  specifications: { group: string; label: string; value: string; provisional?: boolean }[];
  isActive: boolean;
};

type SpecDraft = { key: string; group: string; label: string; value: string; provisional: boolean };
type Draft = {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  conceptNotice: string;
  highlights: string;
  specs: SpecDraft[];
  isActive: boolean;
};

let specKey = 0;
const nextKey = () => `spec-${++specKey}`;

function toDraft(p: ProductFormInitial): Draft {
  return {
    name: p.name,
    slug: p.slug,
    tagline: p.tagline,
    description: p.description,
    conceptNotice: p.conceptNotice,
    highlights: p.highlights.join("\n"),
    specs: p.specifications.map((s) => ({ key: nextKey(), group: s.group, label: s.label, value: s.value, provisional: !!s.provisional })),
    isActive: p.isActive,
  };
}

const isBlankSpec = (s: SpecDraft) => !s.group.trim() && !s.label.trim() && !s.value.trim();

function toPayload(d: Draft, includeActive: boolean) {
  const kept = d.specs.filter((s) => !isBlankSpec(s));
  return {
    kept,
    payload: {
      name: d.name,
      slug: d.slug,
      tagline: d.tagline,
      description: d.description,
      conceptNotice: d.conceptNotice,
      highlights: d.highlights
        .split("\n")
        .map((h) => h.trim())
        .filter(Boolean),
      specifications: kept.map((s) => ({
        group: s.group.trim(),
        label: s.label.trim(),
        value: s.value.trim(),
        ...(s.provisional ? { provisional: true } : {}),
      })),
      ...(includeActive ? { isActive: d.isActive } : {}),
    },
  };
}

const EMPTY: ProductFormInitial = {
  name: "",
  slug: "",
  tagline: "",
  description: "",
  conceptNotice: "",
  highlights: [],
  specifications: [],
  isActive: false,
};

export function ProductForm({ mode, productId, initial }: { mode: "create" | "edit"; productId?: string; initial?: ProductFormInitial }) {
  const { fail, success, router } = useAdminFeedback();
  const formId = useId();
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial ?? EMPTY));
  const [baseline, setBaseline] = useState(() => JSON.stringify(toPayload(toDraft(initial ?? EMPTY), mode === "create").payload));
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  const { payload, kept } = useMemo(() => toPayload(draft, mode === "create"), [draft, mode]);
  const dirty = JSON.stringify(payload) !== baseline;

  useEffect(() => {
    if (!dirty || pending) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, pending]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function setName(name: string) {
    setDraft((d) => ({ ...d, name, slug: slugTouched ? d.slug : slugify(name) }));
  }

  function updateSpec(key: string, patch: Partial<SpecDraft>) {
    setDraft((d) => ({ ...d, specs: d.specs.map((s) => (s.key === key ? { ...s, ...patch } : s)) }));
  }

  function moveSpec(index: number, dir: -1 | 1) {
    setDraft((d) => {
      const specs = [...d.specs];
      const j = index + dir;
      if (j < 0 || j >= specs.length) return d;
      [specs[index], specs[j]] = [specs[j]!, specs[index]!];
      return { ...d, specs };
    });
  }

  function addSpec() {
    setDraft((d) => {
      const lastGroup = d.specs[d.specs.length - 1]?.group ?? "";
      return { ...d, specs: [...d.specs, { key: nextKey(), group: lastGroup, label: "", value: "", provisional: false }] };
    });
  }

  /** Maps "specifications.<keptIndex>.<field>" to the row key so errors survive blank-row filtering. */
  function specError(rowKey: string, field: "group" | "label" | "value") {
    const idx = kept.findIndex((s) => s.key === rowKey);
    return idx >= 0 ? errors[`specifications.${idx}.${field}`] : undefined;
  }

  const highlightsError =
    errors.highlights ??
    Object.entries(errors)
      .filter(([k]) => /^highlights\.\d+$/.test(k))
      .map(([k, v]) => `Line ${Number(k.split(".")[1]) + 1}: ${v}`)[0];

  function showErrors(fe: FieldErrors, message: string) {
    setErrors(fe);
    setFormError(message);
    requestAnimationFrame(() => errorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setFormError(null);
    const parsed = productInputSchema.safeParse(payload);
    if (!parsed.success) {
      showErrors(issuesToFieldErrors(parsed.error.issues), "Some details need attention — see the highlighted fields.");
      return;
    }
    setErrors({});
    setPending(true);
    try {
      if (mode === "create") {
        const res = await adminRequest<{ product: { id: string; name: string } }>("/api/admin/products", { method: "POST", body: payload });
        success("Product created", `${res.product.name} is ready — add variants next.`);
        setBaseline(JSON.stringify(payload));
        router.push(`/admin/products/${res.product.id}`);
        return;
      }
      await adminRequest(`/api/admin/products/${productId}`, { method: "PATCH", body: payload });
      setBaseline(JSON.stringify(payload));
      success("Product saved", "Your changes are live.");
      router.refresh();
      setPending(false);
    } catch (err) {
      setPending(false);
      const ae = toAdminError(err);
      if (ae.status === 422 && ae.fieldErrors) {
        showErrors(ae.fieldErrors, ae.message);
      } else if (ae.status === 409) {
        showErrors({ slug: ae.message }, ae.message);
      } else {
        setFormError(ae.message);
      }
      fail(ae, mode === "create" ? "Couldn't create the product" : "Couldn't save the product");
    }
  }

  function discard() {
    const restored = toDraft(JSON.parse(baseline) as ProductFormInitial & { isActive?: boolean });
    setDraft((d) => ({ ...restored, isActive: d.isActive }));
    setErrors({});
    setFormError(null);
  }

  return (
    <form id={formId} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <div ref={errorRef} aria-live="polite">
        {formError && <InlineAlert title={mode === "create" ? "The product wasn't created" : "Changes weren't saved"}>{formError}</InlineAlert>}
      </div>

      <Panel title="Basics" bodyClassName="grid gap-5 p-4 sm:p-5 md:grid-cols-2">
        <TextField label="Product name" value={draft.name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={160} required disabled={pending} />
        <TextField
          label="URL slug"
          value={draft.slug}
          onChange={(e) => {
            const v = e.target.value.toLowerCase().replace(/\s+/g, "-");
            setSlugTouched(v !== "");
            set("slug", v);
          }}
          onBlur={() => draft.slug && set("slug", slugify(draft.slug))}
          error={errors.slug}
          hint={
            <>
              Store URL: <span className="font-mono text-xs">/product/{draft.slug || "…"}</span>
              {mode === "create" && !slugTouched && " · suggested from the name"}
            </>
          }
          maxLength={120}
          spellCheck={false}
          autoCapitalize="none"
          required
          disabled={pending}
        />
        <TextField
          label="Tagline"
          optional
          value={draft.tagline}
          onChange={(e) => set("tagline", e.target.value)}
          error={errors.tagline}
          maxLength={240}
          className="md:col-span-2"
          disabled={pending}
        />
      </Panel>

      <Panel title="Content" bodyClassName="grid gap-5 p-4 sm:p-5">
        <TextAreaField
          label="Description"
          optional
          value={draft.description}
          onChange={(e) => set("description", e.target.value)}
          error={errors.description}
          maxLength={5000}
          disabled={pending}
        />
        <TextAreaField
          label="Concept notice"
          optional
          hint="Short, honest note about development status, shown near purchase buttons."
          value={draft.conceptNotice}
          onChange={(e) => set("conceptNotice", e.target.value)}
          error={errors.conceptNotice}
          maxLength={1000}
          className="[&_textarea]:min-h-24"
          disabled={pending}
        />
        <TextAreaField
          label="Highlights"
          optional
          hint={`One per line, up to 12 · ${payload.highlights.length} added`}
          value={draft.highlights}
          onChange={(e) => set("highlights", e.target.value)}
          error={highlightsError}
          disabled={pending}
        />
      </Panel>

      <Panel
        title="Specifications"
        description="Grouped rows shown in the product’s spec table. Mark unvalidated design targets as provisional."
        bodyClassName="p-4 sm:p-5"
      >
        {errors.specifications && <p className="mb-3 text-sm text-[#a5321a]" role="alert">{errors.specifications}</p>}
        {draft.specs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-graphite/20 px-4 py-6 text-center text-sm text-graphite/60">No specification rows yet.</p>
        ) : (
          <div className="flex flex-col gap-3 sm:gap-2">
            <div aria-hidden="true" className="hidden grid-cols-[minmax(0,9rem)_minmax(0,11rem)_minmax(0,1fr)_6.5rem_7.25rem] gap-2 px-1 text-[0.7rem] font-medium uppercase tracking-[0.09em] text-graphite/55 sm:grid">
              <span>Group</span>
              <span>Label</span>
              <span>Value</span>
              <span>Provisional</span>
              <span className="sr-only">Actions</span>
            </div>
            {draft.specs.map((s, i) => {
              // Index-based ids: the row keys come from a module counter, which differs between server and client.
              const rowId = `${formId}-spec-${i}`;
              const ge = specError(s.key, "group");
              const le = specError(s.key, "label");
              const ve = specError(s.key, "value");
              const fmt = (field: string, msg?: string) => (msg ? (msg === "This field is required" ? `${field} is required` : `${field}: ${msg}`) : null);
              const rowErrors = [fmt("Group", ge), fmt("Label", le), fmt("Value", ve)].filter(Boolean);
              return (
                <div
                  key={s.key}
                  role="group"
                  aria-label={`Specification row ${i + 1}`}
                  className={cn(
                    "rounded-xl border border-graphite/10 bg-ivory/50 p-3 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0",
                    rowErrors.length > 0 && "border-[#b4361b]/30",
                  )}
                >
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,9rem)_minmax(0,11rem)_minmax(0,1fr)_6.5rem_7.25rem] sm:items-center">
                    <div className="flex flex-col gap-1">
                      <label htmlFor={`${rowId}-g`} className="text-xs text-graphite/60 sm:sr-only">
                        Group (row {i + 1})
                      </label>
                      <input
                        id={`${rowId}-g`}
                        value={s.group}
                        onChange={(e) => updateSpec(s.key, { group: e.target.value })}
                        maxLength={60}
                        aria-invalid={ge ? true : undefined}
                        className={cn(inputClass, "h-10")}
                        disabled={pending}
                        placeholder="Dimensions"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor={`${rowId}-l`} className="text-xs text-graphite/60 sm:sr-only">
                        Label (row {i + 1})
                      </label>
                      <input
                        id={`${rowId}-l`}
                        value={s.label}
                        onChange={(e) => updateSpec(s.key, { label: e.target.value })}
                        maxLength={80}
                        aria-invalid={le ? true : undefined}
                        className={cn(inputClass, "h-10")}
                        disabled={pending}
                        placeholder="Weight"
                      />
                    </div>
                    <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
                      <label htmlFor={`${rowId}-v`} className="text-xs text-graphite/60 sm:sr-only">
                        Value (row {i + 1})
                      </label>
                      <input
                        id={`${rowId}-v`}
                        value={s.value}
                        onChange={(e) => updateSpec(s.key, { value: e.target.value })}
                        maxLength={300}
                        aria-invalid={ve ? true : undefined}
                        className={cn(inputClass, "h-10")}
                        disabled={pending}
                        placeholder="1.4 kg"
                      />
                    </div>
                    <label htmlFor={`${rowId}-p`} className="flex h-10 items-center gap-2 text-sm text-graphite">
                      <input
                        id={`${rowId}-p`}
                        type="checkbox"
                        checked={s.provisional}
                        onChange={(e) => updateSpec(s.key, { provisional: e.target.checked })}
                        className="size-4 accent-forest"
                        disabled={pending}
                      />
                      <span className="sm:sr-only">Provisional</span>
                    </label>
                    <div className="flex items-center justify-end gap-1">
                      <IconButton label={`Move row ${i + 1} up`} onClick={() => moveSpec(i, -1)} disabled={pending || i === 0}>
                        <ArrowUpIcon size={16} />
                      </IconButton>
                      <IconButton label={`Move row ${i + 1} down`} onClick={() => moveSpec(i, 1)} disabled={pending || i === draft.specs.length - 1}>
                        <ArrowDownIcon size={16} />
                      </IconButton>
                      <IconButton
                        label={`Remove row ${i + 1}`}
                        onClick={() => setDraft((d) => ({ ...d, specs: d.specs.filter((x) => x.key !== s.key) }))}
                        disabled={pending}
                        danger
                      >
                        <TrashIcon size={16} />
                      </IconButton>
                    </div>
                  </div>
                  {rowErrors.length > 0 && (
                    <p role="alert" className="mt-1.5 text-sm text-[#a5321a]">
                      {rowErrors.join(" · ")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" size="sm" className="text-forest" icon={<Plus size={16} />} onClick={addSpec} disabled={pending || draft.specs.length >= 40}>
            Add row
          </Button>
          <p className="text-xs text-graphite/55">
            {kept.length} of 40 rows · blank rows are ignored
          </p>
        </div>
      </Panel>

      {mode === "create" && (
        <Panel title="Visibility" bodyClassName="p-4 sm:p-5">
          <CheckboxField
            label={
              <>
                <span className="font-medium">Publish immediately</span>
                <span className="block text-graphite/60">Show this product in the store as soon as it has active variants. You can change this later.</span>
              </>
            }
            checked={draft.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            disabled={pending}
          />
        </Panel>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-graphite/10 bg-ivory/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <p className="text-sm text-graphite/65" aria-live="polite">
          {mode === "create" ? "New product — not saved yet" : dirty ? <span className="font-medium text-[#6b4204]">Unsaved changes</span> : "All changes saved"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {mode === "edit" ? (
            <Button variant="ghost" size="sm" className="text-forest" onClick={discard} disabled={!dirty || pending}>
              Discard changes
            </Button>
          ) : (
            <Link href="/admin/products" className="inline-flex h-9 items-center rounded-full px-4 text-sm font-medium text-forest hover:bg-forest/[0.06]">
              Cancel
            </Link>
          )}
          <Button type="submit" variant="dark" size="sm" loading={pending} disabled={mode === "edit" && !dirty}>
            {mode === "create" ? "Create product" : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid size-9 place-items-center rounded-lg text-graphite/70 transition-colors disabled:opacity-30",
        danger ? "hover:bg-coral-200 hover:text-[#7a2a0d]" : "hover:bg-forest/[0.07] hover:text-forest",
      )}
    >
      {children}
    </button>
  );
}
