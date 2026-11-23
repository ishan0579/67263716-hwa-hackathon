import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SplitHeadline } from "../motion/reveal";
import { Breadcrumbs, Eyebrow } from "../ui/misc";

/** Editorial header for inner pages (breadcrumbs, eyebrow, display title, lede). */
export function PageHeader({
  eyebrow,
  title,
  lede,
  crumbs,
  tone = "light",
  children,
  className,
  size = "lg",
}: {
  eyebrow?: string;
  title: string | string[];
  lede?: ReactNode;
  crumbs?: { href?: string; label: string }[];
  tone?: "light" | "dark";
  children?: ReactNode;
  className?: string;
  size?: "lg" | "md";
}) {
  const dark = tone === "dark";
  return (
    <header
      data-nav={dark ? "dark" : "light"}
      data-surface={dark ? "dark" : "light"}
      className={cn("relative overflow-hidden pt-32 sm:pt-40", dark ? "grain bg-forest text-ivory" : "bg-ivory text-forest", className)}
    >
      <div className="container-x relative pb-14 sm:pb-20">
        {crumbs && <Breadcrumbs items={[{ href: "/", label: "Home" }, ...crumbs]} className="mb-10" />}
        {eyebrow && <Eyebrow className={dark ? "text-mint" : "text-forest-500"}>{eyebrow}</Eyebrow>}
        <SplitHeadline as="h1" animateOnMount text={title} className={cn(size === "lg" ? "text-display-2" : "text-display-3", "mt-5 max-w-[18ch]")} />
        {lede && <p className={cn("text-lede mt-7 max-w-[56ch]", dark ? "text-ivory/75" : "text-graphite/75")}>{lede}</p>}
        {children}
      </div>
    </header>
  );
}
