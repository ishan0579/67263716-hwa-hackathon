import type { Metadata } from "next";
import { NewsletterForm } from "@/components/forms/newsletter-form";
import { PawOnShutter, SniffingDog } from "@/components/illustrations/dogs";
import { PageHeader } from "@/components/layout/page-header";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/misc";

export const metadata: Metadata = {
  title: "Our story",
  description: "Why SniffOrbit exists: a design concept inspired by dogs' love of sniffing, searching and solving — shared honestly, as a concept.",
  alternates: { canonical: "/about" },
};

const PRINCIPLES = [
  { t: "Curiosity first", d: "Design around what dogs naturally do — sniff, nudge, investigate — rather than around a gimmick." },
  { t: "Honest by default", d: "Label concepts as concepts. Mark unvalidated specs as provisional. Never invent reviews, studies or endorsements." },
  { t: "Designed to be made", d: "Plausible mechanisms, manufacturable shapes, washable food-contact parts, no batteries." },
  { t: "Owners in the loop", d: "Interchangeable inserts let people shape the challenge for the dog in front of them." },
];

const ROADMAP = [
  { stage: "Done", t: "Concept & mechanism", d: "Spring-return shutter with ratchet indexing; six insert designs." },
  { stage: "Done", t: "3D model & interactive demo", d: "Procedural model, exploded views and a browser simulation of the logic." },
  { stage: "Next", t: "Physical prototypes", d: "Print and test the ratchet, shutter feel and tray fit." },
  { stage: "Later", t: "Testing & certification", d: "Durability, bite and food-contact testing; supervised trials with dogs and behaviour professionals." },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="Our story"
        title={["A little curiosity", "goes a long way."]}
        lede="SniffOrbit is a design concept about a simple idea: the best part of a puzzle might be the searching, not just the finding."
        crumbs={[{ label: "Story" }]}
      />
      <section data-nav="light" className="bg-ivory pb-24 text-forest">
        <div className="container-x grid items-center gap-14 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <div className="grain relative overflow-hidden rounded-[2.5rem]">
              <SniffingDog className="aspect-[4/5] w-full" title="Illustration of a dog following scent trails." />
            </div>
          </Reveal>
          <div className="space-y-6 text-[1.08rem] leading-relaxed text-graphite/80 lg:col-span-6 lg:col-start-7">
            <p>
              Watch a dog with a new food puzzle and you&apos;ll often see the same arc: intense curiosity, a burst of problem solving, then — once the
              trick is learned — a little less mystery each time.
            </p>
            <p>
              SniffOrbit asks what happens if the puzzle keeps changing. Instead of one challenge, ONE presents a sequence: six chambers, revealed one
              at a time by a spring-loaded shutter and a simple mechanical ratchet. Owners choose the order of the inserts, so the sequence can be
              gentle, curious or clever.
            </p>
            <p>
              It&apos;s important to be clear: <strong className="text-forest">SniffOrbit ONE is a concept.</strong> It hasn&apos;t been manufactured,
              certified or tested with dogs. This site is a working demonstration — the store, checkout and order tracking really work, but no
              payment is taken and nothing ships.
            </p>
          </div>
        </div>
      </section>

      <section data-nav="dark" data-surface="dark" className="grain relative bg-forest py-24 text-ivory sm:py-32">
        <div className="container-x">
          <Eyebrow className="text-mint">Principles</Eyebrow>
          <h2 className="text-display-3 mt-5 max-w-[18ch]">What guides the design</h2>
          <div className="mt-14 grid gap-px overflow-hidden rounded-[var(--radius-panel)] bg-ivory/10 sm:grid-cols-2">
            {PRINCIPLES.map((p, i) => (
              <Reveal key={p.t} delay={i * 0.06} className="bg-forest p-8">
                <p className="tabular font-mono text-sm text-coral">0{i + 1}</p>
                <h3 className="text-display-4 mt-4">{p.t}</h3>
                <p className="mt-3 max-w-[44ch] text-ivory/70">{p.d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section data-nav="light" className="bg-cream py-24 text-forest sm:py-32">
        <div className="container-x grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Eyebrow>Where it&apos;s at</Eyebrow>
            <h2 className="text-display-3 mt-5">From sketch to (someday) shelf</h2>
            <div className="mt-10 overflow-hidden rounded-[2rem]">
              <PawOnShutter className="aspect-square w-full" title="Illustration of a paw pushing the coral shutter." />
            </div>
          </div>
          <ol className="lg:col-span-6 lg:col-start-7">
            {ROADMAP.map((r, i) => (
              <Reveal key={r.t} delay={i * 0.06}>
                <li className="relative border-l-2 border-forest/15 pb-10 pl-8 last:pb-0">
                  <span className={`absolute -left-[9px] top-1 size-4 rounded-full ${r.stage === "Done" ? "bg-forest" : r.stage === "Next" ? "bg-coral" : "bg-sand ring-2 ring-forest/20"}`} />
                  <p className="text-eyebrow text-forest-500">{r.stage}</p>
                  <h3 className="mt-2 text-xl font-medium">{r.t}</h3>
                  <p className="mt-1 text-graphite/70">{r.d}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section data-nav="light" className="bg-ivory py-24 text-forest">
        <div className="container-x flex flex-col items-start justify-between gap-10 lg:flex-row lg:items-end">
          <div>
            <h2 className="text-display-3 max-w-[16ch]">Follow along as it evolves.</h2>
            <div className="mt-8">
              <NewsletterForm source="about" tone="light" />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/how-it-works" variant="dark" arrow>
              How it works
            </ButtonLink>
            <ButtonLink href="/contact" variant="outline">
              Get in touch
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
