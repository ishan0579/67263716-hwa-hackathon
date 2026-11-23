import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ArrowRight } from "./icons";
import { Spinner } from "./spinner";

type Variant = "primary" | "dark" | "light" | "outline" | "ghost" | "mint";
type Size = "sm" | "md" | "lg";

const base =
  "group/btn relative inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-full font-medium tracking-[-0.01em] transition-[background-color,color,box-shadow,transform,border-color] duration-300 ease-[var(--ease-out-quart)] disabled:cursor-not-allowed disabled:opacity-45 select-none active:scale-[0.98]";

const variants: Record<Variant, string> = {
  primary: "bg-coral text-forest hover:bg-coral-600 shadow-[inset_0_-2px_0_rgb(0_0_0/0.08)]",
  dark: "bg-forest text-ivory hover:bg-forest-600",
  light: "bg-ivory text-forest hover:bg-white",
  mint: "bg-mint text-forest hover:bg-mint-300",
  outline: "border border-current/25 text-current hover:border-current/70 hover:bg-current/[0.04]",
  ghost: "text-current hover:bg-current/[0.06]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-12 px-6 text-[0.95rem]",
  lg: "h-14 px-7 text-base sm:h-[3.75rem] sm:px-8",
};

type Common = {
  variant?: Variant;
  size?: Size;
  arrow?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
};

function Inner({ arrow, loading, icon, children }: Pick<Common, "arrow" | "loading" | "icon" | "children">) {
  return (
    <>
      {loading ? <Spinner className="size-4" /> : icon}
      <span>{children}</span>
      {arrow && !loading && (
        <span className="relative -mr-1 inline-flex size-5 overflow-hidden" aria-hidden="true">
          <ArrowRight
            size={18}
            className="absolute inset-0 m-auto transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover/btn:translate-x-[140%]"
          />
          <ArrowRight
            size={18}
            className="absolute inset-0 m-auto -translate-x-[140%] transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover/btn:translate-x-0"
          />
        </span>
      )}
    </>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  arrow,
  loading,
  icon,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: Common & Omit<ComponentProps<"button">, "children">) {
  return (
    <button
      type={type}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      <Inner arrow={arrow} loading={loading} icon={icon}>
        {children}
      </Inner>
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  arrow,
  icon,
  className,
  children,
  href,
  ...rest
}: Common & Omit<ComponentProps<typeof Link>, "children">) {
  return (
    <Link href={href} className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      <Inner arrow={arrow} icon={icon}>
        {children}
      </Inner>
    </Link>
  );
}

export function TextLink({ className, children, ...rest }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "inline-flex items-center gap-1.5 underline decoration-current/30 decoration-1 underline-offset-[5px] transition-colors hover:decoration-current",
        className,
      )}
      {...rest}
    >
      {children}
    </Link>
  );
}
