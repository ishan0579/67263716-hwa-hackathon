"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "./icons";

type FieldShell = {
  label: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  className?: string;
  tone?: "light" | "dark";
};

const controlBase =
  "peer w-full rounded-[var(--radius-control)] border bg-white/70 px-4 text-[0.98rem] text-graphite placeholder:text-graphite/40 transition-[border-color,box-shadow,background-color] duration-200 focus:bg-white focus:outline-none focus-visible:shadow-none focus:border-forest focus:ring-4 focus:ring-mint/70 disabled:opacity-60 aria-[invalid=true]:border-[#b4361b] aria-[invalid=true]:ring-[#b4361b]/15";

function Shell({
  id,
  label,
  error,
  hint,
  optional,
  className,
  children,
}: FieldShell & { id: string; children: ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="flex items-baseline justify-between text-sm font-medium text-graphite">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-graphite/55">Optional</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="flex items-start gap-1.5 text-sm text-[#a5321a]">
          <span aria-hidden="true" className="mt-[7px] size-1.5 shrink-0 rounded-full bg-current" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-graphite/60">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: ReactNode) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

export function TextField({
  label,
  error,
  hint,
  optional,
  className,
  id: idProp,
  ...input
}: FieldShell & ComponentProps<"input">) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <Shell id={id} label={label} error={error} hint={hint} optional={optional} className={className}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(controlBase, "h-12 border-graphite/15")}
        {...input}
      />
    </Shell>
  );
}

export function TextAreaField({
  label,
  error,
  hint,
  optional,
  className,
  id: idProp,
  ...input
}: FieldShell & ComponentProps<"textarea">) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <Shell id={id} label={label} error={error} hint={hint} optional={optional} className={className}>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(controlBase, "min-h-36 resize-y border-graphite/15 py-3 leading-relaxed")}
        {...input}
      />
    </Shell>
  );
}

export function SelectField({
  label,
  error,
  hint,
  optional,
  className,
  id: idProp,
  children,
  ...select
}: FieldShell & ComponentProps<"select">) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <Shell id={id} label={label} error={error} hint={hint} optional={optional} className={className}>
      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          className={cn(controlBase, "h-12 appearance-none border-graphite/15 pr-10")}
          {...select}
        >
          {children}
        </select>
        <ChevronDown
          size={18}
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-graphite/60"
        />
      </div>
    </Shell>
  );
}

export function CheckboxField({
  label,
  error,
  className,
  id: idProp,
  ...input
}: { label: ReactNode; error?: string; className?: string } & ComponentProps<"input">) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="flex items-start gap-3 text-sm leading-relaxed text-graphite">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 size-5 shrink-0 cursor-pointer appearance-none rounded-[6px] border border-graphite/30 bg-white transition checked:border-forest checked:bg-forest checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20stroke=%22%23B9E5DB%22%20stroke-width=%223%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%3E%3Cpath%20d=%22m5%2012.5%204.2%204.2L19%207%22/%3E%3C/svg%3E')] bg-[length:14px] bg-center bg-no-repeat"
          {...input}
        />
        <span>{label}</span>
      </label>
      {error && (
        <p id={`${id}-error`} role="alert" className="pl-8 text-sm text-[#a5321a]">
          {error}
        </p>
      )}
    </div>
  );
}
