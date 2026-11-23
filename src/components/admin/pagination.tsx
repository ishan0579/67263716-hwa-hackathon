import Link from "next/link";
import { ChevronLeft, ChevronRight } from "@/components/ui/icons";
import { buildQuery } from "./format";

/** Prev / next pagination that preserves the current filters in the URL. */
export function Pagination({
  basePath,
  page,
  totalPages,
  params,
}: {
  basePath: string;
  page: number;
  totalPages: number;
  params: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;
  const href = (p: number) => `${basePath}${buildQuery({ ...params, page: p > 1 ? p : undefined })}`;
  const btn =
    "inline-flex h-9 items-center gap-1.5 rounded-full border border-graphite/15 px-3.5 text-sm font-medium text-forest transition-colors hover:border-forest/40 hover:bg-forest/[0.04]";
  const disabled = "inline-flex h-9 items-center gap-1.5 rounded-full border border-graphite/10 px-3.5 text-sm font-medium text-graphite/35";
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 border-t border-graphite/[0.07] px-4 py-3 sm:px-5">
      {page > 1 ? (
        <Link href={href(page - 1)} className={btn} rel="prev">
          <ChevronLeft size={16} /> Previous
        </Link>
      ) : (
        <span className={disabled} aria-disabled="true">
          <ChevronLeft size={16} /> Previous
        </span>
      )}
      <p className="tabular text-sm text-graphite/65">
        Page <span className="font-medium text-graphite">{page}</span> of {totalPages}
      </p>
      {page < totalPages ? (
        <Link href={href(page + 1)} className={btn} rel="next">
          Next <ChevronRight size={16} />
        </Link>
      ) : (
        <span className={disabled} aria-disabled="true">
          Next <ChevronRight size={16} />
        </span>
      )}
    </nav>
  );
}
