import { notFound } from "next/navigation";
import { COLORWAYS } from "@/content/product";
import { RenderStudioLoader } from "./loader";

export const metadata = { robots: { index: false, follow: false } };

/** Development-only route used to generate product renders. Disabled in production. */
export default async function RenderPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const sp = await searchParams;
  const c = COLORWAYS.find((x) => x.key === sp.color) ?? COLORWAYS[0]!;
  const view = (["hero", "top", "exploded", "xray"].includes(sp.view ?? "") ? sp.view : "hero") as
    | "hero"
    | "top"
    | "exploded"
    | "xray";
  return (
    <div style={{ background: sp.bg ? `#${sp.bg}` : "transparent" }}>
      <RenderStudioLoader colorHex={c.colorHex} accentHex={c.accentHex} view={view} />
    </div>
  );
}
