import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { BrandMark, Wordmark } from "@/components/layout/brand-mark";
import { ArrowLeft, Info } from "@/components/ui/icons";
import { getCurrentAdmin } from "@/server/auth/session";

export const metadata = { title: "Sign in" };

export default async function AdminLoginPage() {
  const admin = await getCurrentAdmin();
  if (admin) redirect("/admin");

  return (
    <div className="grid min-h-dvh bg-ivory lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section
        data-surface="dark"
        aria-label="SniffOrbit studio admin"
        className="grain relative hidden flex-col justify-between overflow-hidden bg-forest p-12 text-ivory lg:flex"
      >
        <div className="flex items-center gap-2.5">
          <BrandMark className="size-9 text-ivory" />
          <Wordmark className="text-ivory" />
        </div>
        <BrandMark
          active={2}
          className="pointer-events-none absolute -right-28 top-1/2 size-[30rem] -translate-y-1/2 text-white/[0.06]"
        />
        <div className="relative max-w-md">
          <p className="text-eyebrow text-mint">Studio admin</p>
          <p className="text-display-4 mt-4 text-ivory">Orders, products and stock — in one calm place.</p>
          <p className="mt-5 text-[0.95rem] leading-relaxed text-ivory/70">
            Manage test orders, keep inventory honest and answer messages for the SniffOrbit ONE demonstration store.
          </p>
        </div>
        <p className="relative flex items-start gap-2 text-sm text-ivory/60">
          <Info size={16} className="mt-0.5 shrink-0 text-mint" />
          Demo store — all orders and figures are test data. No payments are taken.
        </p>
      </section>

      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-[25rem]">
          <div className="mb-10 flex items-center gap-2.5 text-forest lg:hidden">
            <BrandMark className="size-8" />
            <Wordmark />
            <span className="rounded-full bg-forest px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.12em] text-mint">Admin</span>
          </div>
          <h1 className="font-display text-[2rem] font-semibold leading-tight tracking-[-0.03em] text-forest">Sign in</h1>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-graphite/70">Use your administrator account to continue.</p>
          <div className="mt-8">
            <LoginForm />
          </div>
          <p className="mt-6 flex items-start gap-2 rounded-xl bg-sand/60 px-3.5 py-3 text-xs leading-relaxed text-graphite/70">
            <Info size={15} className="mt-px shrink-0 text-forest" />
            Credentials are configured via environment variables (see README).
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 rounded-md text-sm text-graphite/70 underline-offset-4 hover:text-forest hover:underline"
          >
            <ArrowLeft size={16} />
            Back to the store
          </Link>
        </div>
      </main>
    </div>
  );
}
