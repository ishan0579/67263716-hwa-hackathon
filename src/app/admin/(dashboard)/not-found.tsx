import { ButtonLink } from "@/components/ui/button";
import { Search } from "@/components/ui/icons";

export default function AdminNotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-graphite/10 bg-white px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-mint/60 text-forest">
        <Search size={22} />
      </span>
      <h1 className="font-display text-2xl font-semibold tracking-tight text-forest">We couldn&apos;t find that record</h1>
      <p className="max-w-[44ch] text-sm leading-relaxed text-graphite/70">
        It may have been removed, or the link is incorrect. Use the navigation to find what you were looking for.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <ButtonLink href="/admin/orders" variant="dark" size="sm">
          Orders
        </ButtonLink>
        <ButtonLink href="/admin/products" variant="outline" size="sm" className="text-forest">
          Products
        </ButtonLink>
      </div>
    </div>
  );
}
