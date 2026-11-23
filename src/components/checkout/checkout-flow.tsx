"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useHydrated } from "@/hooks/use-client";
import { useForm, type FieldPath } from "react-hook-form";
import { z } from "zod";
import { cartStore } from "@/lib/cart/store";
import { useCartQuote } from "@/lib/cart/use-quote";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  COUNTRIES,
  contactDetailsSchema,
  shippingAddressSchema,
  shippingMethodSchema,
  type ShippingMethodId,
} from "@/lib/validation/checkout";
import { SummaryRows } from "../cart/order-summary";
import { ProductThumb } from "../cart/product-thumb";
import { EmptyCart } from "../cart/empty-cart";
import { Button, ButtonLink } from "../ui/button";
import { CheckboxField, SelectField, TextAreaField, TextField } from "../ui/field";
import { Alert, ArrowLeft, Check, Info, Shield } from "../ui/icons";
import { Breadcrumbs } from "../ui/misc";
import { Skeleton } from "../ui/spinner";
import { useToast } from "../ui/toast";

const formSchema = z.object({
  contact: contactDetailsSchema,
  shipping: shippingAddressSchema,
  shippingMethod: shippingMethodSchema,
  note: z.string().trim().max(500, "Keep notes under 500 characters").optional().or(z.literal("")),
  acceptTerms: z.boolean().refine((v) => v, "Please confirm you understand this is a test order"),
});
type FormValues = z.input<typeof formSchema>;

const STEPS = ["Cart", "Contact", "Shipping", "Delivery", "Review"] as const;
const STEP_FIELDS: FieldPath<FormValues>[][] = [
  [],
  ["contact.email", "contact.firstName", "contact.lastName", "contact.phone"],
  ["shipping.line1", "shipping.line2", "shipping.city", "shipping.region", "shipping.postalCode", "shipping.country"],
  ["shippingMethod"],
  ["note", "acceptTerms"],
];

function stepForField(path: string) {
  if (path.startsWith("contact")) return 1;
  if (path.startsWith("shipping.")) return 2;
  if (path === "shippingMethod") return 3;
  if (path.startsWith("lines")) return 0;
  return 4;
}

/** One idempotency key per distinct submission payload, reused across retries and refreshes. */
function idempotencyKeyFor(signature: string) {
  const KEY = "so.checkout.idem";
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as { sig: string; key: string } | null;
    if (saved && saved.sig === signature) return saved.key;
    const key = crypto.randomUUID().replace(/-/g, "");
    sessionStorage.setItem(KEY, JSON.stringify({ sig: signature, key }));
    return key;
  } catch {
    return crypto.randomUUID().replace(/-/g, "");
  }
}
function clearIdempotencyKey() {
  try {
    sessionStorage.removeItem("so.checkout.idem");
  } catch {}
}

export function CheckoutFlow({
  stripeEnabled,
  initialShipping,
  cancelledRef,
}: {
  stripeEnabled: boolean;
  initialShipping: ShippingMethodId;
  cancelledRef: string | null;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [step, setStep] = useState(0);
  const hydrated = useHydrated();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onTouched",
    defaultValues: {
      contact: { email: "", firstName: "", lastName: "", phone: "" },
      shipping: { line1: "", line2: "", city: "", region: "", postalCode: "", country: "US" },
      shippingMethod: initialShipping,
      note: "",
      acceptTerms: false,
    },
  });
  const { register, formState, trigger, watch, getValues, setError, handleSubmit } = form;
  const errors = formState.errors;
  const method = watch("shippingMethod") as ShippingMethodId;
  const country = watch("shipping.country");
  const { lines, quote, loading, refresh } = useCartQuote(method);
  const countryInfo = COUNTRIES.find((c) => c.code === country) ?? COUNTRIES[0];

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const next = async () => {
    if (step === 0 && quote && !quote.valid) {
      push({ tone: "error", title: "Your cart needs attention", description: "Some items changed. Update your cart to continue." });
      return;
    }
    const ok = await trigger(STEP_FIELDS[step], { shouldFocus: true });
    if (ok) setStep((s) => Math.min(4, s + 1));
  };

  const onSubmit = async (values: FormValues) => {
    if (submitting) return;
    setSubmitError(null);
    const payload = {
      ...values,
      acceptTerms: true,
      lines: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
    };
    const signature = JSON.stringify([payload.lines, values.contact.email, values.shipping, values.shippingMethod]);
    const key = idempotencyKeyFor(signature);
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": key },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        clearIdempotencyKey();
        cartStore.clear();
        if (/^https?:\/\//.test(body.redirectUrl)) window.location.assign(body.redirectUrl);
        else router.push(body.redirectUrl);
        return;
      }
      const err = body?.error ?? {};
      if (res.status === 422 && err.fieldErrors) {
        let first: number | null = null;
        for (const [path, message] of Object.entries(err.fieldErrors as Record<string, string>)) {
          if (!path.startsWith("lines")) setError(path as FieldPath<FormValues>, { message });
          const s = stepForField(path);
          first = first === null ? s : Math.min(first, s);
        }
        if (first !== null) setStep(first);
        setSubmitError("Some details need attention — we've highlighted them.");
      } else if (res.status === 409 && err.code === "cart_conflict") {
        refresh();
        setStep(0);
        setSubmitError("Stock changed while you were checking out. Please review your cart.");
      } else if (res.status === 409 && err.code === "idempotency_conflict") {
        clearIdempotencyKey();
        setSubmitError("Your details changed since the last attempt. Please place the order again.");
      } else {
        setSubmitError(err.message ?? "We couldn't place your order. Please try again.");
      }
      setSubmitting(false);
    } catch {
      setSubmitError("Connection problem — your order may not have been placed. Submitting again is safe: you won't be charged twice or get a duplicate order.");
      setSubmitting(false);
    }
  };

  if (!hydrated) {
    return (
      <Shell step={0}>
        <div className="grid gap-10 lg:grid-cols-12">
          <Skeleton className="h-96 lg:col-span-7" />
          <Skeleton className="h-72 lg:col-span-4 lg:col-start-9" />
        </div>
      </Shell>
    );
  }

  if (lines.length === 0 && !submitting) {
    return (
      <Shell step={0}>
        <div className="grid min-h-[45svh] place-items-center">
          <EmptyCart />
        </div>
      </Shell>
    );
  }

  const v = getValues();

  return (
    <Shell step={step} onStep={(i) => i < step && setStep(i)}>
      {cancelledRef && step === 0 && (
        <div role="status" className="mb-6 flex gap-3 rounded-2xl bg-sand p-4 text-sm">
          <Info size={18} className="mt-0.5 shrink-0" />
          Payment for {cancelledRef} was cancelled, so that order was not confirmed. Any reserved stock is released automatically.
        </div>
      )}
      <form
        onSubmit={
          step < 4
            ? (e) => {
                e.preventDefault();
                void next();
              }
            : handleSubmit(onSubmit)
        }
        noValidate
        className="grid gap-12 lg:grid-cols-12"
      >
        <div className="lg:col-span-7">
          <h2 ref={headingRef} tabIndex={-1} className="font-display text-3xl font-semibold tracking-[-0.03em] outline-none">
            {["Review your cart", "Contact details", "Shipping address", "Delivery method", "Review & place test order"][step]}
          </h2>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8"
            >
              {step === 0 && (
                <div>
                  <ul className="divide-y hairline border-y hairline">
                    {(quote?.lines ?? []).map((l) => (
                      <li key={l.variantId} className="flex items-center gap-4 py-4">
                        <div className="size-20 shrink-0 rounded-xl bg-sand/70 p-1.5">
                          <ProductThumb colorHex={l.colorHex} accentHex={l.accentHex} className="size-full" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{l.productName}</p>
                          <p className="text-sm text-graphite/65">
                            {l.colorName} · {l.sizeLabel} · Qty {l.requestedQuantity}
                          </p>
                          {l.message && (
                            <p className="mt-1 flex items-center gap-1.5 text-sm text-[#a5321a]">
                              <Alert size={14} /> {l.message}
                            </p>
                          )}
                        </div>
                        <p className="tabular font-medium">{formatMoney(l.lineTotalCents, "USD", { exact: true })}</p>
                      </li>
                    ))}
                    {!quote && <Skeleton className="my-4 h-20 w-full" />}
                  </ul>
                  {quote && !quote.valid && (
                    <p className="mt-4 text-sm">
                      <Link href="/cart" className="font-medium underline underline-offset-4">
                        Update your cart
                      </Link>{" "}
                      to resolve the highlighted items.
                    </p>
                  )}
                </div>
              )}

              {step === 1 && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <TextField
                    label="Email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    className="sm:col-span-2"
                    hint="We'll show your order details here — no emails are sent in this demo."
                    error={errors.contact?.email?.message}
                    {...register("contact.email")}
                  />
                  <TextField label="First name" autoComplete="given-name" error={errors.contact?.firstName?.message} {...register("contact.firstName")} />
                  <TextField label="Last name" autoComplete="family-name" error={errors.contact?.lastName?.message} {...register("contact.lastName")} />
                  <TextField label="Phone" type="tel" autoComplete="tel" optional className="sm:col-span-2" error={errors.contact?.phone?.message} {...register("contact.phone")} />
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-5 sm:grid-cols-6">
                  <SelectField label="Country" className="sm:col-span-6" autoComplete="country" error={errors.shipping?.country?.message} {...register("shipping.country")}>
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </SelectField>
                  <TextField label="Street address" autoComplete="address-line1" className="sm:col-span-6" error={errors.shipping?.line1?.message} {...register("shipping.line1")} />
                  <TextField label="Apartment, suite, etc." optional autoComplete="address-line2" className="sm:col-span-6" error={errors.shipping?.line2?.message} {...register("shipping.line2")} />
                  <TextField label="City" autoComplete="address-level2" className="sm:col-span-3" error={errors.shipping?.city?.message} {...register("shipping.city")} />
                  <TextField label={countryInfo.regionLabel} autoComplete="address-level1" className="sm:col-span-1" error={errors.shipping?.region?.message} {...register("shipping.region")} />
                  <TextField label={countryInfo.postalLabel} autoComplete="postal-code" className="sm:col-span-2" error={errors.shipping?.postalCode?.message} {...register("shipping.postalCode")} />
                </div>
              )}

              {step === 3 && (
                <fieldset>
                  <legend className="sr-only">Delivery method</legend>
                  <div className="space-y-3">
                    {(quote?.shippingOptions ?? []).map((o) => (
                      <label
                        key={o.id}
                        className={cn(
                          "flex cursor-pointer items-center justify-between gap-4 rounded-2xl border p-5 transition-colors",
                          method === o.id ? "border-forest bg-white ring-1 ring-forest" : "border-graphite/15 bg-white/50 hover:border-graphite/35",
                        )}
                      >
                        <span className="flex items-center gap-4">
                          <input type="radio" value={o.id} {...register("shippingMethod")} className="size-5 accent-forest" />
                          <span>
                            <span className="block font-medium">{o.label}</span>
                            <span className="block text-sm text-graphite/60">{o.description}</span>
                          </span>
                        </span>
                        <span className="tabular text-right font-medium">
                          {o.priceCents === 0 ? "Free" : formatMoney(o.priceCents, "USD", { exact: true })}
                          {o.priceCents === 0 && o.basePriceCents > 0 && (
                            <span className="block text-xs font-normal text-graphite/50 line-through">{formatMoney(o.basePriceCents, "USD", { exact: true })}</span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-4 text-sm text-graphite/60">Delivery times are illustrative — demonstration orders are never shipped.</p>
                </fieldset>
              )}

              {step === 4 && (
                <div className="space-y-6">
                  <ReviewBlock title="Contact" onEdit={() => setStep(1)}>
                    {v.contact.firstName} {v.contact.lastName}
                    <br />
                    {v.contact.email}
                    {v.contact.phone ? (
                      <>
                        <br />
                        {v.contact.phone}
                      </>
                    ) : null}
                  </ReviewBlock>
                  <ReviewBlock title="Ship to" onEdit={() => setStep(2)}>
                    {v.shipping.line1}
                    {v.shipping.line2 ? `, ${v.shipping.line2}` : ""}
                    <br />
                    {v.shipping.city}, {v.shipping.region} {v.shipping.postalCode}
                    <br />
                    {COUNTRIES.find((c) => c.code === v.shipping.country)?.name}
                  </ReviewBlock>
                  <ReviewBlock title="Delivery" onEdit={() => setStep(3)}>
                    {quote?.shippingOptions.find((o) => o.id === method)?.label} — {quote?.shippingOptions.find((o) => o.id === method)?.description}
                  </ReviewBlock>
                  <TextAreaField label="Order note" optional rows={3} error={errors.note?.message} {...register("note")} />
                  <div className="rounded-2xl bg-sand/70 p-5">
                    <p className="flex items-center gap-2 font-medium">
                      <Shield size={18} /> {stripeEnabled ? "Stripe test mode" : "Test-order mode"}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-graphite/75">
                      {stripeEnabled
                        ? "You'll be redirected to Stripe's hosted checkout in TEST mode. Use Stripe's test card numbers — no real charge is made and this site never sees card details."
                        : "No payment details are requested. Placing the order creates a real order record in our database with a reference and private tracking key — but no money is taken and nothing ships."}
                    </p>
                    <CheckboxField
                      className="mt-4"
                      label="I understand this is a demonstration store and that this is a test order for a concept product."
                      error={errors.acceptTerms?.message}
                      {...register("acceptTerms")}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {submitError && (
            <p role="alert" className="mt-6 flex gap-2 rounded-xl bg-coral-200/70 p-4 text-sm text-[#6b230b]">
              <Alert size={18} className="shrink-0" />
              {submitError}
            </p>
          )}

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t hairline pt-6">
            {step > 0 ? (
              <button type="button" onClick={() => setStep((s) => s - 1)} className="inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline">
                <ArrowLeft size={16} /> Back
              </button>
            ) : (
              <Link href="/cart" className="inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline">
                <ArrowLeft size={16} /> Edit cart
              </Link>
            )}
            {step < 4 ? (
              <Button size="lg" onClick={next} arrow disabled={step === 0 && (!quote || !quote.valid)}>
                Continue to {STEPS[step + 1]?.toLowerCase()}
              </Button>
            ) : (
              <Button type="submit" size="lg" loading={submitting} disabled={!quote?.valid}>
                {submitting ? "Placing order…" : stripeEnabled ? `Pay ${quote ? formatMoney(quote.totalCents, "USD", { exact: true }) : ""} (test mode)` : `Place test order · ${quote ? formatMoney(quote.totalCents, "USD", { exact: true }) : ""}`}
              </Button>
            )}
          </div>
        </div>

        <aside aria-label="Order summary" className="lg:col-span-4 lg:col-start-9">
          <div className="rounded-[var(--radius-panel)] bg-white/70 p-6 ring-1 ring-graphite/10 lg:sticky lg:top-28">
            <h2 className="font-display text-xl font-semibold tracking-[-0.02em]">Order summary</h2>
            <ul className="mt-5 space-y-4">
              {lines.map((l) => {
                const q = quote?.lines.find((x) => x.variantId === l.variantId);
                return (
                  <li key={l.variantId} className="flex items-center gap-3 text-sm">
                    <div className="relative size-14 shrink-0 rounded-lg bg-sand/70 p-1">
                      <ProductThumb colorHex={l.colorHex} accentHex={l.accentHex} className="size-full" />
                      <span className="tabular absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-forest text-[0.65rem] font-semibold text-ivory">
                        {l.quantity}
                      </span>
                    </div>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{l.colorName}</span>
                      <span className="block text-graphite/60">{l.sizeLabel}</span>
                    </span>
                    <span className="tabular">{formatMoney((q?.unitPriceCents ?? l.priceCents) * l.quantity, "USD", { exact: true })}</span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-6 border-t hairline pt-5">
              <SummaryRows quote={quote} loading={loading} />
            </div>
            <p className="mt-5 flex gap-2 text-xs leading-relaxed text-graphite/55">
              <Check size={14} className="mt-0.5 shrink-0" /> Totals are recalculated on the server from live prices and stock when you place the order.
            </p>
          </div>
        </aside>
      </form>
    </Shell>
  );
}

function Shell({ step, children, onStep }: { step: number; children: React.ReactNode; onStep?: (i: number) => void }) {
  return (
    <section data-nav="light" className="min-h-[85svh] bg-ivory pb-24 pt-28 text-forest sm:pt-32">
      <div className="container-x">
        <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/cart", label: "Cart" }, { label: "Checkout" }]} />
        <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
          <h1 className="text-display-3">Checkout</h1>
          <ButtonLink href="/cart" variant="ghost" size="sm">
            Back to cart
          </ButtonLink>
        </div>
        <nav aria-label="Checkout progress" className="mb-12 mt-8">
          <ol className="flex flex-wrap gap-x-2 gap-y-3">
            {STEPS.map((label, i) => {
              const done = i < step;
              const current = i === step;
              return (
                <li key={label} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onStep?.(i)}
                    disabled={!done}
                    aria-current={current ? "step" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-sm transition-colors",
                      current ? "bg-forest text-ivory" : done ? "bg-mint/70 text-forest hover:bg-mint" : "bg-graphite/[0.05] text-graphite/50",
                    )}
                  >
                    <span className={cn("tabular grid size-6 place-items-center rounded-full text-xs font-semibold", current ? "bg-coral text-forest" : done ? "bg-forest text-ivory" : "bg-white")}>
                      {done ? <Check size={13} /> : i + 1}
                    </span>
                    {label}
                  </button>
                  {i < STEPS.length - 1 && <span aria-hidden="true" className="h-px w-4 bg-graphite/20 sm:w-8" />}
                </li>
              );
            })}
          </ol>
        </nav>
        {children}
      </div>
    </section>
  );
}

function ReviewBlock({ title, children, onEdit }: { title: string; children: React.ReactNode; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b hairline pb-5">
      <div>
        <p className="text-eyebrow text-graphite/55">{title}</p>
        <p className="mt-2 leading-relaxed">{children}</p>
      </div>
      <button type="button" onClick={onEdit} className="text-sm font-medium underline underline-offset-4" aria-label={`Edit ${title.toLowerCase()}`}>
        Edit
      </button>
    </div>
  );
}
