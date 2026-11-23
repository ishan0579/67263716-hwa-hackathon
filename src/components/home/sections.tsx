import Link from "next/link";
import { FAQ } from "@/content/faq";
import type { PublicProduct } from "@/server/services/catalog";
import { formatMoney } from "@/lib/money";
import { NewsletterForm } from "../forms/newsletter-form";
import { NoseAndKibble } from "../illustrations/dogs";
import { Reveal, SplitHeadline } from "../motion/reveal";
import { Configurator } from "../product/configurator";
import { SpecTable } from "../product/spec-table";
import { PuzzleSimulation } from "../simulation/puzzle-simulation";
import { Accordion } from "../ui/accordion";
import { ButtonLink, TextLink } from "../ui/button";
import { Alert, ArrowRight, Leaf, Shield } from "../ui/icons";
import { ConceptNotice, Eyebrow } from "../ui/misc";
import { ProductFallback } from "../three/product-fallback";
import { QuickAdd } from "./quick-add";

/* ─────────────── Section 6 · Interactive play demonstration ─────────────── */
export function PlaySection() {
  return (
    <section id="play" data-nav="dark" data-surface="dark" aria-labelledby="play-title" className="grain relative overflow-hidden bg-graphite py-24 text-ivory sm:py-32">
      <div className="container-x">
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Eyebrow index="04" className="text-mint">
              Interactive demo
            </Eyebrow>
            <SplitHeadline as="h2" id="play-title" text={["Your turn to", "be the dog."]} className="text-display-2 mt-6" />
          </div>
          <p className="text-lede self-end text-ivory/70 lg:col-span-4 lg:col-start-9">
            Load the chambers, pick a starting point, then sniff, push and discover. A working model of the mechanism — right in your browser.
          </p>
        </div>
        <div className="mt-16">
          <PuzzleSimulation tone="dark" />
        </div>
        <div className="mt-12">
          <TextLink href="/experience" className="text-mint">
            Open the full-screen experience <ArrowRight size={16} />
          </TextLink>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── Section 8 · Configurator ─────────────────────── */
export function ConfiguratorSection({ product }: { product: PublicProduct }) {
  return (
    <section id="configure" data-nav="light" aria-labelledby="config-title" className="relative bg-ivory py-24 text-forest sm:py-32">
      <div className="container-x">
        <div className="mb-14 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Eyebrow index="06">Make it yours</Eyebrow>
            <h2 id="config-title" className="text-display-2 mt-6">
              Pick a colour. <span className="font-serif-italic font-normal">Pick a size.</span>
            </h2>
          </div>
          <p className="text-lede self-end text-graphite/75 lg:col-span-4 lg:col-start-9">
            Rotate it, open it, look inside. Every option below is a real, stock-tracked variant in this demo store.
          </p>
        </div>
        <Configurator product={product} />
      </div>
    </section>
  );
}

/* ─────────────────────── Section 9 · Product details ─────────────────────── */
export function DetailsSection({ product }: { product: PublicProduct }) {
  return (
    <section id="details" data-nav="dark" data-surface="dark" aria-labelledby="details-title" className="relative bg-forest py-24 text-ivory sm:py-32">
      <div className="container-x">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Eyebrow index="07" className="text-mint">
              The details
            </Eyebrow>
            <h2 id="details-title" className="text-display-3 mt-6">
              Honest specs, <span className="font-serif-italic font-normal text-mint">clearly labelled.</span>
            </h2>
            <p className="mt-6 text-ivory/70">
              Anything not yet validated by a prototype is marked <em>provisional</em>. We would rather show you a design target than invent a
              verified fact.
            </p>
            <div className="mt-10 space-y-6">
              <div className="flex gap-4">
                <Shield size={22} className="mt-0.5 shrink-0 text-mint" />
                <div>
                  <h3 className="font-medium">Safety considerations</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ivory/65">
                    Supervised use only. Not a chew toy. Remove if damaged. Not tested or certified — and not for dogs that chew or destroy toys.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Leaf size={22} className="mt-0.5 shrink-0 text-mint" />
                <div>
                  <h3 className="font-medium">Suitability guidelines</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ivory/65">
                    Designed for dry kibble and small treats. Choose Standard for roughly 5–20 kg, Large for 15–40 kg. Flat-faced breeds may
                    prefer shallower inserts.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Alert size={22} className="mt-0.5 shrink-0 text-coral" />
                <div>
                  <h3 className="font-medium">Concept status</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ivory/65">{product.conceptNotice}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <SpecTable specs={product.specifications} tone="dark" />
            <div className="mt-10">
              <TextLink href="/product/snifforbit-one" className="text-mint">
                Full product page <ArrowRight size={16} />
              </TextLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── Section 10 · Brand philosophy ─────────────────────── */
export function PhilosophySection() {
  const words = ["sniff", "nudge", "slide", "discover", "repeat", "explore", "wonder"];
  return (
    <section data-nav="light" aria-labelledby="philosophy-title" className="relative overflow-hidden bg-aqua py-24 text-forest sm:py-36">
      <div aria-hidden="true" className="flex overflow-hidden whitespace-nowrap border-y border-forest/10 py-5">
        <div className="flex shrink-0 animate-[marquee_38s_linear_infinite] gap-10 pr-10 font-display text-4xl font-semibold tracking-[-0.03em] text-forest/25 sm:text-6xl">
          {[...words, ...words, ...words, ...words].map((w, i) => (
            <span key={i} className="flex items-center gap-10">
              {w}
              <span className="inline-block size-3 rounded-full bg-coral/70" />
            </span>
          ))}
        </div>
      </div>
      <div className="container-x mt-20 grid items-center gap-14 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Eyebrow index="08">Philosophy</Eyebrow>
          <SplitHeadline as="h2" id="philosophy-title" text={["A little curiosity", "goes a long way."]} className="text-display-2 mt-6" />
          <Reveal className="mt-10 grid gap-6 text-[1.05rem] leading-relaxed text-graphite/80 sm:grid-cols-2">
            <p>
              SniffOrbit started with a simple observation: dogs meet the world nose-first. Sniffing, searching and working something out seem to
              matter to them as much as the reward at the end.
            </p>
            <p>
              So instead of one clever trick, we designed a small sequence of them — a toy that changes as it&apos;s played, and that owners can
              rearrange. It&apos;s a concept, shared openly, and shaped by curiosity of our own.
            </p>
          </Reveal>
          <Reveal className="mt-10">
            <TextLink href="/about">Read the full story</TextLink>
          </Reveal>
        </div>
        <Reveal className="lg:col-span-4 lg:col-start-9">
          <div className="grain relative overflow-hidden rounded-[2.5rem] rotate-2">
            <NoseAndKibble className="aspect-[4/5] w-full object-cover" title="Illustration of a dog's nose close to a piece of kibble." />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────────── Section 11 · FAQ ─────────────────────────── */
export function FaqSection() {
  const items = FAQ.slice(0, 7).map((f) => ({ id: `faq-${f.id}`, question: f.question, answer: f.answer }));
  return (
    <section id="faq" data-nav="light" aria-labelledby="faq-title" className="bg-ivory py-24 text-forest sm:py-32">
      <div className="container-x grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Eyebrow index="09">Questions</Eyebrow>
          <h2 id="faq-title" className="text-display-3 mt-6">
            Good questions, <span className="font-serif-italic font-normal">straight answers.</span>
          </h2>
          <p className="mt-6 text-graphite/70">
            Can&apos;t find yours? <Link href="/faq" className="underline underline-offset-4">See all FAQs</Link> or{" "}
            <Link href="/contact" className="underline underline-offset-4">ask us</Link>.
          </p>
        </div>
        <div className="lg:col-span-7 lg:col-start-6">
          <Accordion items={items} />
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── Section 12 · Final conversion ─────────────────────── */
export function FinalCtaSection({ product }: { product: PublicProduct }) {
  const def = product.variants.find((v) => v.colorKey === "morning-walk" && v.size === "standard") ?? product.variants[0];
  return (
    <section data-nav="dark" data-surface="dark" aria-labelledby="final-title" className="grain relative overflow-hidden bg-forest text-ivory">
      <div aria-hidden="true" className="absolute left-1/2 top-[55%] h-[110vmin] w-[110vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,#1c5e64,rgba(12,52,56,0))]" />
      <div className="container-x relative grid items-center gap-10 py-24 sm:py-32 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <Eyebrow index="10" className="text-mint">
            Ready when they are
          </Eyebrow>
          <SplitHeadline as="h2" id="final-title" text={["Their next", "adventure", "starts here."]} className="text-display-1 mt-6" />
          <p className="text-lede mt-8 max-w-[42ch] text-ivory/75">
            Six chambers, one spring-loaded door and a mechanism that keeps the story moving. Configure yours in a minute.
          </p>
          <p className="mt-6 text-ivory/60">
            <span className="tabular font-display text-4xl font-semibold text-ivory">{formatMoney(product.priceFromCents)}</span>
            <span className="ml-2">Standard · {def ? formatMoney(product.variants.find((v) => v.size === "large")?.priceCents ?? def.priceCents) : ""} Large</span>
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/customize" size="lg" arrow>
              Customize yours
            </ButtonLink>
            {def && <QuickAdd variant={def} productName={product.name} />}
          </div>
          <ConceptNotice tone="dark" className="mt-10 max-w-lg" />
        </div>
        <div className="relative aspect-square lg:col-span-6">
          <ProductFallback colorKey="morning-walk" colorHex="#F1EBDD" accentHex="#FF794B" alt="SniffOrbit ONE in Morning Walk — ivory shell with a coral shutter" sizes="(max-width: 1024px) 90vw, 45vw" />
        </div>
      </div>
      <div className="border-t border-ivory/10">
        <div className="container-x flex flex-col items-start justify-between gap-6 py-10 md:flex-row md:items-center">
          <p className="max-w-md text-ivory/70">Not ready yet? Get occasional notes from the studio as the concept evolves.</p>
          <NewsletterForm source="final-cta" />
        </div>
      </div>
    </section>
  );
}
