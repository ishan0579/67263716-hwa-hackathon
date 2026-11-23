import { notFound } from "next/navigation";
import { CuriousDogsSection } from "@/components/home/curious-dogs-section";
import { DiscoveriesSection } from "@/components/home/discoveries-section";
import { Hero } from "@/components/home/hero";
import { ProblemSection } from "@/components/home/problem-section";
import { RevealSection } from "@/components/home/reveal-section";
import {
  ConfiguratorSection,
  DetailsSection,
  FaqSection,
  FinalCtaSection,
  PhilosophySection,
  PlaySection,
} from "@/components/home/sections";
import { PRODUCT_SLUG } from "@/content/product";
import { formatMoney } from "@/lib/money";
import { getProductBySlug } from "@/server/services/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const product = await getProductBySlug(PRODUCT_SLUG);
  if (!product) notFound();

  return (
    <>
      <Hero priceFrom={formatMoney(product.priceFromCents)} />
      <ProblemSection />
      <RevealSection />
      <DiscoveriesSection />
      <PlaySection />
      <CuriousDogsSection />
      <ConfiguratorSection product={product} />
      <DetailsSection product={product} />
      <PhilosophySection />
      <FaqSection />
      <FinalCtaSection product={product} />
    </>
  );
}
