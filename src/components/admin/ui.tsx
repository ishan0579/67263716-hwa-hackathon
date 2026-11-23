import Link from "next/link";
import type { ReactNode } from "react";
import { Alert, Info } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/* Shared, server-safe layout primitives for the admin area. */

const displayStyle = { fontVariationSettings: '"wdth" 88, "opsz" 48' } as const;

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  meta,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-col gap-4 sm:mb-9">
      {breadcrumbs && <div className="text-graphite/70">{breadcrumbs}</div>}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1
            className="font-display text-[1.85rem] font-semibold leading-[1.05] tracking-[-0.03em] text-forest break-words sm:text-[2.2rem]"
            style={displayStyle}
          >
            {title}
          </h1>
          {meta && <div className="mt-2.5 flex flex-wrap items-center gap-2 text-sm text-graphite/70">{meta}</div>}
          {description && <p className="mt-2 max-w-[62ch] text-[0.95rem] leading-relaxed text-graphite/70">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  id,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={id && title ? `${id}-title` : undefined}
      className={cn("min-w-0 rounded-2xl border border-graphite/10 bg-white shadow-[0_1px_2px_rgb(12_52_56/0.04)]", className)}
    >
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-graphite/[0.08] px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h2 id={id ? `${id}-title` : undefined} className="font-display text-[1.08rem] font-semibold tracking-[-0.015em] text-forest" style={displayStyle}>
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-graphite/60">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/** Horizontal scroll container for wide tables (keyboard-scrollable). */
export function TableScroll({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    // `relative` keeps absolutely-positioned descendants (e.g. sr-only text) inside the scroller.
    <div role="region" aria-label={label} tabIndex={0} className={cn("relative overflow-x-auto overscroll-x-contain rounded-b-2xl", className)}>
      {children}
    </div>
  );
}

export const tableClass = "w-full border-collapse text-left text-sm";
export const thClass =
  "whitespace-nowrap px-4 py-2.5 text-[0.7rem] font-medium uppercase tracking-[0.09em] text-graphite/55 first:pl-4 sm:first:pl-5 last:pr-4 sm:last:pr-5";
export const tdClass = "px-4 py-3 align-middle first:pl-4 sm:first:pl-5 last:pr-4 sm:last:pr-5";
export const trClass = "border-t border-graphite/[0.07]";
export const theadClass = "bg-sand/35";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-12 text-center", className)}>
      {icon && <span className="grid size-12 place-items-center rounded-full bg-mint/60 text-forest">{icon}</span>}
      <p className="font-display text-lg font-semibold text-forest" style={displayStyle}>
        {title}
      </p>
      {description && <p className="max-w-[44ch] text-sm leading-relaxed text-graphite/65">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  href,
  icon,
  emphasis,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  href?: string;
  icon?: ReactNode;
  emphasis?: boolean;
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className={cn("text-sm leading-snug", emphasis ? "text-forest/80" : "text-graphite/65")}>{label}</p>
        {icon && (
          <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", emphasis ? "bg-forest text-mint" : "bg-sand/70 text-forest")}>
            {icon}
          </span>
        )}
      </div>
      <p className="tabular mt-3 font-display text-[2rem] font-semibold leading-none tracking-[-0.03em] text-forest" style={displayStyle}>
        {value}
      </p>
      {hint && <p className="mt-2 text-xs leading-snug text-graphite/60">{hint}</p>}
    </>
  );
  const cls = cn(
    "flex min-w-0 flex-col rounded-2xl border p-4 sm:p-5",
    emphasis ? "border-forest/15 bg-mint/45" : "border-graphite/10 bg-white",
    href && "transition-[border-color,box-shadow] hover:border-forest/30 hover:shadow-[0_6px_20px_-12px_rgb(12_52_56/0.35)]",
    className,
  );
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function InlineAlert({
  tone = "error",
  title,
  children,
  className,
}: {
  tone?: "error" | "info" | "warning";
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const tones = {
    error: "border-[#b4361b]/25 bg-[#fdeee8] text-[#7a2a0d]",
    warning: "border-[#c98a1b]/30 bg-[#fdf3dd] text-[#5c3a05]",
    info: "border-forest/15 bg-aqua text-forest",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm leading-relaxed", tones[tone], className)}>
      {tone === "info" ? <Info size={18} className="mt-0.5 shrink-0" /> : <Alert size={18} className="mt-0.5 shrink-0" />}
      <div className="min-w-0">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(title && "mt-0.5 opacity-90")}>{children}</div>}
      </div>
    </div>
  );
}

/** Compact control styling for dense admin forms (spec rows, inline edits). */
export const inputClass =
  "w-full rounded-[var(--radius-control)] border border-graphite/15 bg-white px-3 text-sm text-graphite placeholder:text-graphite/40 transition-[border-color,box-shadow] focus:border-forest focus:outline-none focus:ring-4 focus:ring-mint/70 disabled:opacity-60 aria-[invalid=true]:border-[#b4361b] aria-[invalid=true]:ring-[#b4361b]/15";

export function DescriptionList({ items, className }: { items: { label: string; value: ReactNode }[]; className?: string }) {
  return (
    <dl className={cn("grid gap-x-4 gap-y-3 text-sm", className)}>
      {items.map((it) => (
        <div key={it.label} className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] gap-3">
          <dt className="text-graphite/60">{it.label}</dt>
          <dd className="min-w-0 break-words text-graphite">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Swatch({ hex, className, label }: { hex: string; className?: string; label?: string }) {
  return (
    <span
      className={cn("inline-block size-3.5 shrink-0 rounded-full ring-1 ring-inset ring-black/15", className)}
      style={{ backgroundColor: hex }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
