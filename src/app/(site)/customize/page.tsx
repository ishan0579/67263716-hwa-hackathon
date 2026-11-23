import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Configurator, type Recommendation } from "@/components/product/configurator";
import { Breadcrumbs, ConceptNotice } from "@/components/ui/misc";
import { TextLink } from "@/components/ui/button";
import { PRODUCT_SLUG } from "@/content/product";
import { getProductBySlug } from "@/server/services/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Customize your SniffOrbit ONE",
  description: "Choose a colourway and size, inspect the SniffOrbit ONE concept in 3D — exploded view, inside view and a working mechanism demo — then add it to your cart.",
  alternates: { canonical: "/customize" },
};

export default async function CustomizePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const product = await getProductBySlug(PRODUCT_SLUG);
  if (!product) notFound();

  const level = Number(sp.level);
  const recommendation: Recommendation | null =
    sp.from === "match" && (sp.size === "standard" || sp.size === "large") && [1, 2, 3].includes(level)
      ? { size: sp.size, level: level as 1 | 2 | 3 }
      : null;

  return (
    <section data-nav="light" className="bg-ivory pb-20 pt-28 text-forest sm:pt-32">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "Customize" }]} />
            <h1 className="text-display-3 mt-6">Customize SniffOrbit ONE</h1>
          </div>
          <p className="max-w-sm text-sm text-graphite/70">
            Unsure about size? <TextLink href="/dog-match">Take the 2-minute Dog Match</TextLink> for an explained recommendation.
          </p>
        </div>
        <div className="mt-10">
          <Configurator product={product} layout="page" initialColor={sp.color} initialSize={sp.size} recommendation={recommendation} />
        </div>
        <ConceptNotice className="mt-14 max-w-3xl" />
      </div>
    </section>
  );
}
