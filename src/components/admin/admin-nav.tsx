"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType } from "react";
import { BrandMark, Wordmark } from "@/components/layout/brand-mark";
import { Close, Menu } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { initials } from "./format";
import { BoxIcon, GridIcon, MailIcon, ReceiptIcon, StackIcon } from "./icons";
import { SignOutButton } from "./sign-out-button";

type NavItem = { href: string; label: string; icon: ComponentType<{ size?: number; className?: string }>; exact?: boolean };

const NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: GridIcon, exact: true },
  { href: "/admin/orders", label: "Orders", icon: ReceiptIcon },
  { href: "/admin/products", label: "Products", icon: BoxIcon },
  { href: "/admin/inventory", label: "Inventory", icon: StackIcon },
  { href: "/admin/messages", label: "Messages", icon: MailIcon },
];

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label="Admin sections">
      <ul className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.95rem] transition-colors",
                  active ? "bg-mint font-medium text-forest" : "text-ivory/75 hover:bg-white/[0.07] hover:text-ivory",
                )}
              >
                <Icon size={19} className={active ? "text-forest" : "text-mint/80"} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AdminIdentityCard({ name, email }: { name: string; email: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-coral font-display text-sm font-semibold text-forest">
        {initials(name)}
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-medium text-ivory">{name}</p>
        <p className="truncate text-xs text-ivory/60" title={email}>
          {email}
        </p>
      </div>
    </div>
  );
}

export function ViewStoreLink({ className }: { className?: string }) {
  return (
    <a
      href="/"
      target="_blank"
      rel="noopener noreferrer"
      className={cn("inline-flex items-center gap-2 rounded-md text-sm text-ivory/75 underline-offset-4 hover:text-ivory hover:underline", className)}
    >
      View store <span aria-hidden="true">↗</span>
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

/** Compact top bar + slide-over menu for small screens. */
export function AdminMobileBar({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div data-surface="dark" className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 bg-forest px-4 text-ivory lg:hidden">
      <Link href="/admin" className="flex items-center gap-2 rounded-md">
        <BrandMark className="size-7 text-ivory" />
        <Wordmark className="text-[1.1rem] text-ivory" />
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.12em] text-mint">Admin</span>
      </Link>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium hover:bg-white/10"
      >
        <Menu size={20} />
        Menu
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} side="right" label="Admin menu" className="max-w-[20rem] bg-forest text-ivory">
        <div data-surface="dark" className="flex h-full flex-col gap-6 overflow-y-auto p-5">
          <div className="flex items-center justify-between">
            <span className="text-eyebrow text-mint/80">Admin menu</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-10 place-items-center rounded-full hover:bg-white/10"
              aria-label="Close menu"
            >
              <Close size={20} />
            </button>
          </div>
          <AdminNav onNavigate={() => setOpen(false)} />
          <div className="mt-auto flex flex-col gap-4 border-t border-white/10 pt-5">
            <ViewStoreLink />
            <AdminIdentityCard name={name} email={email} />
            <SignOutButton className="w-full text-ivory" />
          </div>
        </div>
      </Sheet>
    </div>
  );
}
