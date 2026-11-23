import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { FAQ } from "@/content/faq";
import { DISCOVERIES } from "@/content/discoveries";
import { Configurator } from "@/components/product/configurator";
import { SpecTable } from "@/components/product/spec-table";
import { Reveal } from "@/components/motion/reveal";
import { Accordion } from "@/components/ui/accordion";
import { ButtonLink } from "@/components/ui/button";
import { Check } from "@/components/ui/icons";
import { Breadcrumbs, ConceptNotice, Eyebrow } from "@/components/ui/misc";
import { formatMoney } from "@/lib/money";
import { SITE } from "@/lib/site";
import { getProductBySlug } from "@/server/services/catalog";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  const image = product.images[0]?.url ?? "/opengraph-image";
  return {
    title: `${product.name} — ${product.tagline}`,
    description: `${product.description.slice(0, 150)}…`,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: { title: product.name, description: product.tagline, images: [{ url: image, width: 1200, height: 1200 }] },
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const prices = product.variants.map((v) => v.priceCents);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    brand: { "@type": "Brand", name: "SniffOrbit" },
    image: product.images.map((i) => `${SITE.url}${i.url}`),
    sku: product.variants[0]?.sku,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: (Math.min(...prices) / 100).toFixed(2),
      highPrice: (Math.max(...prices) / 100).toFixed(2),
      offerCount: product.variants.length,
      availability: product.variants.some((v) => v.stockStatus !== "sold_out") ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${SITE.url}/product/${product.slug}`,
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section data-nav="light" className="bg-ivory pt-28 text-forest sm:pt-32">
        <div className="container-x">
          <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/customize", label: "Shop" }, { label: product.name }]} />
          <div className="mt-8 grid gap-4 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <Eyebrow className="text-forest-500">Enrichment puzzle · concept</Eyebrow>
              <h1 className="text-display-2 mt-4">{product.name}</h1>
            </div>
            <p className="text-lede text-graphite/75 lg:col-span-5">
              {product.tagline} From <strong className="tabular font-semibold text-forest">{formatMoney(product.priceFromCents)}</strong>.
            </p>
          </div>
          <div className="mt-10 pb-20">
            <Configurator product={product} initialColor={sp.color} initialSize={sp.size} />
          </div>
        </div>
      </section>

      <section data-nav="light" aria-labelledby="overview-title" className="bg-cream py-24 text-forest">
        <div className="container-x grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Eyebrow>Overview</Eyebrow>
            <h2 id="overview-title" className="text-display-3 mt-5">
              One door. <span className="font-serif-italic font-normal">Six discoveries.</span>
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-graphite/80">{product.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/how-it-works" variant="dark" arrow>
                How it works
              </ButtonLink>
              <ButtonLink href="/experience" variant="outline">
                Try the demo
              </ButtonLink>
            </div>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-6 lg:col-start-7">
            {product.highlights.map((h, i) => (
              <Reveal key={h} delay={i * 0.05}>
                <li className="flex h-full gap-3 rounded-2xl bg-white/70 p-5">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-mint text-forest">
                    <Check size={15} />
                  </span>
                  <span className="text-[0.98rem] leading-snug">{h}</span>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section data-nav="light" aria-labelledby="inserts-title" className="bg-ivory py-24 text-forest">
        <div className="container-x">
          <Eyebrow>Inserts</Eyebrow>
          <h2 id="inserts-title" className="text-display-3 mt-5 max-w-[20ch]">
            Six interchangeable chamber inserts
          </h2>
          <ol className="mt-12 grid gap-px overflow-hidden rounded-[var(--radius-panel)] bg-graphite/10 sm:grid-cols-2 lg:grid-cols-3">
            {DISCOVERIES.map((d) => (
              <li key={d.key} className="bg-ivory p-6">
                <p className="text-eyebrow text-forest-500">0{d.index + 1}</p>
                <h3 className="mt-3 font-display text-2xl font-semibold tracking-[-0.02em]">{d.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-graphite/70">{d.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section data-nav="light" aria-labelledby="gallery-title" className="bg-sand/50 py-24 text-forest">
        <div className="container-x">
          <h2 id="gallery-title" className="text-display-4">Four colourways</h2>
          <ul className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {product.images.map((img) => (
              <li key={img.url} className="relative aspect-square overflow-hidden rounded-[var(--radius-panel)] bg-ivory">
                <Image src={img.url} alt={img.alt} fill sizes="(max-width: 1024px) 50vw, 25vw" className="object-contain p-4" />
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-graphite/55">Images are renders of the 3D concept model, not photographs of a manufactured product.</p>
        </div>
      </section>

      <section data-nav="light" aria-labelledby="specs-title" className="bg-ivory py-24 text-forest">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Eyebrow>Specifications</Eyebrow>
            <h2 id="specs-title" className="text-display-3 mt-5">
              The details
            </h2>
            <ConceptNotice className="mt-8" />
          </div>
          <div className="lg:col-span-8">
            <SpecTable specs={product.specifications} />
          </div>
        </div>
      </section>

      <section data-nav="light" aria-labelledby="pfaq-title" className="bg-cream py-24 text-forest">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <h2 id="pfaq-title" className="text-display-3 lg:col-span-4">
            Before you order
          </h2>
          <div className="lg:col-span-8">
            <Accordion items={FAQ.filter((f) => ["sizes", "cleaning", "food", "unattended", "ordering"].includes(f.id)).map((f) => ({ id: `pf-${f.id}`, question: f.question, answer: f.answer }))} />
          </div>
        </div>
      </section>
    </>
  );
}
