"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChevronDown } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";

/** Filters the movement history by variant via the `variant` search param. */
export function MovementFilter({ value, options }: { value: string; options: { value: string; label: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="movement-variant" className="text-sm text-graphite/70">
        Variant
      </label>
      <div className="relative">
        <select
          id="movement-variant"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            startTransition(() => router.push(v ? `/admin/inventory?variant=${v}#movements` : "/admin/inventory#movements", { scroll: false }));
          }}
          className="h-9 max-w-[16rem] appearance-none rounded-full border border-graphite/15 bg-white pl-3.5 pr-9 text-sm text-graphite focus:border-forest focus:outline-none focus:ring-4 focus:ring-mint/70"
        >
          <option value="">All variants</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-graphite/55" />
      </div>
      {pending && <Spinner className="size-4 text-forest" label="Loading movements" />}
    </div>
  );
}
