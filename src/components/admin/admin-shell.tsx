import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark, Wordmark } from "@/components/layout/brand-mark";
import { Info } from "@/components/ui/icons";
import { AdminIdentityCard, AdminMobileBar, AdminNav, ViewStoreLink } from "./admin-nav";
import { SignOutButton } from "./sign-out-button";

/** Chrome for the authenticated admin area: sidebar (desktop) / top bar (mobile). */
export function AdminShell({ admin, children }: { admin: { name: string; email: string }; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-ivory lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-coral focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-forest"
      >
        Skip to content
      </a>

      {/* The column itself is forest so the sidebar colour runs the full page height. */}
      <div className="hidden bg-forest lg:block">
        <aside data-surface="dark" aria-label="Admin sidebar" className="sticky top-0 flex h-dvh flex-col bg-forest text-ivory">
          <div className="px-5 pb-7 pt-7">
            <Link href="/admin" className="flex items-center gap-2.5 rounded-md">
              <BrandMark className="size-8 text-ivory" />
              <span className="flex flex-col">
                <Wordmark className="text-[1.2rem] text-ivory" />
                <span className="mt-1 text-[0.62rem] font-medium uppercase tracking-[0.18em] text-mint/80">Studio admin</span>
              </span>
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto px-3">
            <AdminNav />
          </div>
          <div className="flex flex-col gap-4 border-t border-white/10 px-5 py-5">
            <ViewStoreLink />
            <AdminIdentityCard name={admin.name} email={admin.email} />
            <SignOutButton className="w-full text-ivory" />
          </div>
        </aside>
      </div>

      <div className="flex min-w-0 flex-col">
        <AdminMobileBar name={admin.name} email={admin.email} />
        <p
          role="note"
          className="flex items-center justify-center gap-2 border-b border-graphite/10 bg-sand/70 px-4 py-2 text-center text-xs text-graphite/75"
        >
          <Info size={14} className="shrink-0 text-forest" />
          <span>
            <strong className="font-medium text-forest">Demo store</strong> — all figures are test data
          </span>
        </p>
        <main id="admin-main" tabIndex={-1} className="mx-auto w-full max-w-[86rem] flex-1 px-4 py-6 focus:outline-none sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
