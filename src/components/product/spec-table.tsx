import type { PublicProduct } from "@/server/services/catalog";
import { Badge } from "../ui/misc";

/** Specifications grouped by category; unvalidated values carry a "Provisional" tag. */
export function SpecTable({ specs, tone = "light" }: { specs: PublicProduct["specifications"]; tone?: "light" | "dark" }) {
  const groups = [...new Set(specs.map((s) => s.group))];
  return (
    <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
      {groups.map((g) => (
        <div key={g}>
          <h3 className="text-eyebrow opacity-60">{g}</h3>
          <dl className="mt-4 border-t hairline">
            {specs
              .filter((s) => s.group === g)
              .map((s) => (
                <div key={s.label} className="grid grid-cols-[minmax(7rem,38%)_1fr] gap-4 border-b hairline py-3.5 text-[0.95rem]">
                  <dt className="opacity-65">{s.label}</dt>
                  <dd className="flex flex-wrap items-start gap-2">
                    <span>{s.value}</span>
                    {s.provisional && (
                      <Badge tone={tone === "dark" ? "mint" : "warning"} className="mt-0.5">
                        Provisional
                      </Badge>
                    )}
                  </dd>
                </div>
              ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
