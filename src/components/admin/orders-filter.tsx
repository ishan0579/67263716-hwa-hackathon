"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { ChevronDown, Close, Search } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { buildQuery } from "./format";

/**
 * Search + status filter for the orders list. State lives in the URL so
 * results are shareable and the server component does the querying.
 * Works without JavaScript too (plain GET form).
 */
export function OrdersFilter({
  q,
  status,
  statusOptions,
}: {
  q: string;
  status: string;
  statusOptions: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(q);
  const [statusValue, setStatusValue] = useState(status);

  function go(next: { q: string; status: string }) {
    const url = `/admin/orders${buildQuery({ q: next.q.trim(), status: next.status === "all" ? "" : next.status })}`;
    startTransition(() => router.push(url, { scroll: false }));
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    go({ q: query, status: statusValue });
  }

  const hasFilters = q !== "" || status !== "all";

  return (
    <form
      role="search"
      aria-label="Filter orders"
      method="get"
      action="/admin/orders"
      onSubmit={onSubmit}
      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:p-5"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <label htmlFor="orders-q" className="text-sm font-medium text-graphite">
          Search
        </label>
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-graphite/45" />
          <input
            id="orders-q"
            name="q"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, email or reference (SO-…)"
            maxLength={100}
            autoComplete="off"
            className="h-11 w-full rounded-[var(--radius-control)] border border-graphite/15 bg-white pl-10 pr-3 text-[0.95rem] text-graphite placeholder:text-graphite/40 focus:border-forest focus:outline-none focus:ring-4 focus:ring-mint/70"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5 sm:w-52">
        <label htmlFor="orders-status" className="text-sm font-medium text-graphite">
          Status
        </label>
        <div className="relative">
          <select
            id="orders-status"
            name="status"
            value={statusValue}
            onChange={(e) => {
              setStatusValue(e.target.value);
              go({ q: query, status: e.target.value });
            }}
            className="h-11 w-full appearance-none rounded-[var(--radius-control)] border border-graphite/15 bg-white pl-3 pr-9 text-[0.95rem] text-graphite focus:border-forest focus:outline-none focus:ring-4 focus:ring-mint/70"
          >
            <option value="all">All statuses</option>
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown size={17} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-graphite/55" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-forest px-5 text-sm font-medium text-ivory transition-colors hover:bg-forest-600 disabled:opacity-60"
        >
          {pending ? <Spinner className="size-4" /> : <Search size={16} />}
          Search
        </button>
        {hasFilters && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setQuery("");
              setStatusValue("all");
              go({ q: "", status: "all" });
            }}
            className={cn(
              "inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-medium text-forest transition-colors hover:bg-forest/[0.06] disabled:opacity-60",
            )}
          >
            <Close size={15} />
            Clear
          </button>
        )}
      </div>
      <span className="sr-only" aria-live="polite">
        {pending ? "Updating results…" : ""}
      </span>
    </form>
  );
}
