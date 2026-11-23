import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, Info, Minus, Plus } from "./icons";

export function Eyebrow({ children, className, index }: { children: ReactNode; className?: string; index?: string }) {
  return (
    <p className={cn("text-eyebrow flex items-center gap-3", className)}>
      {index && <span className="tabular opacity-60">{index}</span>}
      {index && <span aria-hidden="true" className="h-px w-8 bg-current opacity-40" />}
      <span>{children}</span>
    </p>
  );
}

export function Breadcrumbs({ items, className }: { items: { href?: string; label: string }[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm", className)}>
      <ol className="flex flex-wrap items-center gap-1.5 opacity-80">
        {items.map((it, i) => (
          <li key={it.label} className="flex items-center gap-1.5">
            {it.href && i < items.length - 1 ? (
              <Link href={it.href} className="underline-offset-4 hover:underline">
                {it.label}
              </Link>
            ) : (
              <span aria-current={i === items.length - 1 ? "page" : undefined} className="font-medium opacity-100">
                {it.label}
              </span>
            )}
            {i < items.length - 1 && <ChevronRight size={14} className="opacity-50" />}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "mint" | "coral" | "forest" | "warning" | "muted";
  className?: string;
}) {
  const tones = {
    neutral: "bg-graphite/[0.07] text-graphite",
    mint: "bg-mint text-forest",
    coral: "bg-coral-200 text-[#7a2a0d]",
    forest: "bg-forest text-ivory",
    warning: "bg-[#fde9c8] text-[#6b4204]",
    muted: "bg-graphite/[0.05] text-graphite/60",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium leading-none",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Honest disclosure that this is a concept product / demonstration store. */
export function ConceptNotice({ className, tone = "light", children }: { className?: string; tone?: "light" | "dark"; children?: ReactNode }) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-4 text-sm leading-relaxed",
        tone === "dark" ? "border-ivory/15 bg-white/[0.04] text-ivory/80" : "border-graphite/10 bg-white/60 text-graphite/75",
        className,
      )}
    >
      <Info size={18} className={cn("mt-0.5 shrink-0", tone === "dark" ? "text-mint" : "text-forest")} />
      <p>
        {children ?? (
          <>
            <strong className="font-semibold">Concept product · demonstration store.</strong> SniffOrbit ONE has not been manufactured,
            certified or behaviour-tested. Checkout creates a real test order record, but no payment is taken and nothing ships.
          </>
        )}
      </p>
    </div>
  );
}

export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  label = "Quantity",
  size = "md",
  disabled,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (v: number) => void;
  label?: string;
  size?: "sm" | "md";
  disabled?: boolean;
}) {
  const btn = cn(
    "grid place-items-center rounded-full transition-colors hover:bg-current/[0.08] disabled:opacity-30 disabled:hover:bg-transparent",
    size === "sm" ? "size-8" : "size-10",
  );
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex items-center rounded-full border border-current/20",
        size === "sm" ? "h-10 px-1" : "h-12 px-1",
      )}
    >
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={disabled || value <= min} aria-label={`Decrease ${label.toLowerCase()}`}>
        <Minus size={16} />
      </button>
      <output aria-live="polite" className={cn("tabular text-center font-medium", size === "sm" ? "w-7 text-sm" : "w-9")}>
        {value}
      </output>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label={`Increase ${label.toLowerCase()}`}>
        <Plus size={16} />
      </button>
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  index,
  title,
  lede,
  className,
  align = "left",
}: {
  eyebrow?: string;
  index?: string;
  title: ReactNode;
  lede?: ReactNode;
  className?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("flex flex-col gap-5", align === "center" && "items-center text-center", className)}>
      {eyebrow && <Eyebrow index={index}>{eyebrow}</Eyebrow>}
      <h2 className="text-display-3 max-w-[16ch]">{title}</h2>
      {lede && <p className="text-lede max-w-[54ch] opacity-75">{lede}</p>}
    </div>
  );
}
