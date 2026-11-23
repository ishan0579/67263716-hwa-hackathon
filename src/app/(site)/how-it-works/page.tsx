import type { Metadata } from "next";
import { DISCOVERIES } from "@/content/discoveries";
import { MechanismStory } from "@/components/how/mechanism-story";
import { HowViewer } from "@/components/how/viewer-section";
import { PageHeader } from "@/components/layout/page-header";
import { Reveal } from "@/components/motion/reveal";
import { LAYERS } from "@/components/three/layers";
import { ButtonLink } from "@/components/ui/button";
import { Check, Info } from "@/components/ui/icons";
import { Eyebrow } from "@/components/ui/misc";

export const metadata: Metadata = {
  title: "How it works — the SniffOrbit mechanism",
  description:
    "Sniff, slide, discover, click: how SniffOrbit ONE's spring-return shutter and ratchet indexing tray present six chambers one at a time. Explore every layer in 3D.",
  alternates: { canonical: "/how-it-works" },
};

const LAYER_COPY: Record<string, string> = {
  base: "Elastomer ring for grip on hard floors; sits under the weighted housing.",
  housing: "Soft-touch outer shell that holds everything and carries the weight low.",
  indexer: "Six-tooth ratchet keyed to the tray, a stainless pawl and the shutter's return spring.",
  tray: "Removable food-contact tray with six chambers and interchangeable inserts.",
  lid: "Twist-lock lid with a single access window and scent-port clusters.",
  shutter: "The large sliding door and its centre hub — the only part your dog moves.",
};

const LEVELS = [
  { name: "Gentle", order: [0, 1, 2, 3, 4, 5], note: "Open Cup first so the shutter-means-food connection forms quickly." },
  { name: "Curious", order: [2, 1, 3, 0, 4, 5], note: "Start with a search, then alternate easier and harder chambers." },
  { name: "Clever", order: [3, 4, 5, 2, 1, 0], note: "Lead with the two-step inserts for puzzle-experienced dogs." },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader
        tone="dark"
        eyebrow="How it works"
        title={["One door.", "Six chambers.", "One click at a time."]}
        lede="SniffOrbit ONE turns a single food puzzle into a sequence. Here's the proposed mechanism, step by step — including what still needs to be proven."
        crumbs={[{ label: "How it works" }]}
      />

      <section data-nav="dark" data-surface="dark" aria-label="The four-step cycle" className="bg-forest pb-24 text-ivory">
        <div className="container-x">
          <MechanismStory />
        </div>
      </section>

      <section data-nav="light" aria-labelledby="layers-title" className="bg-ivory py-24 text-forest sm:py-32">
        <div className="container-x">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <Eyebrow>Explore it</Eyebrow>
              <h2 id="layers-title" className="text-display-3 mt-5">
                Take it apart — <span className="font-serif-italic font-normal">virtually.</span>
              </h2>
            </div>
            <p className="text-lede self-end text-graphite/75 lg:col-span-5 lg:col-start-8">
              Use <strong>Exploded</strong> to separate the six layers, <strong>Inside</strong> to see through the shell, pick a chamber, or run the
              mechanism.
            </p>
          </div>
          <div className="mt-12 grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <HowViewer />
            </div>
            <ol className="space-y-5 lg:col-span-4">
              {[...LAYERS].reverse().map((l, i) => (
                <Reveal key={l.key} delay={i * 0.04}>
                  <li className="border-b hairline pb-5">
                    <p className="text-eyebrow text-forest-500">Layer 0{i + 1}</p>
                    <h3 className="mt-2 text-lg font-medium">{l.label}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-graphite/70">{LAYER_COPY[l.key]}</p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section data-nav="light" aria-labelledby="levels-title" className="bg-cream py-24 text-forest sm:py-32">
        <div className="container-x">
          <Eyebrow>Adjustable difficulty</Eyebrow>
          <h2 id="levels-title" className="text-display-3 mt-5 max-w-[22ch]">
            Reorder the inserts, change the story.
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {LEVELS.map((lv, li) => (
              <Reveal key={lv.name} delay={li * 0.08}>
                <div className="h-full rounded-[var(--radius-panel)] bg-white/70 p-6 ring-1 ring-forest/10">
                  <p className="text-eyebrow text-forest-500">Level {li + 1}</p>
                  <h3 className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em]">{lv.name}</h3>
                  <ol className="mt-5 space-y-2 text-sm">
                    {lv.order.map((idx, pos) => (
                      <li key={idx} className="flex items-center gap-3">
                        <span className="tabular grid size-6 place-items-center rounded-full bg-forest text-[0.7rem] font-semibold text-ivory">{pos + 1}</span>
                        {DISCOVERIES[idx]!.name}
                      </li>
                    ))}
                  </ol>
                  <p className="mt-5 text-sm leading-relaxed text-graphite/70">{lv.note}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section data-nav="light" aria-labelledby="care-title" className="bg-ivory py-24 text-forest sm:py-32">
        <div className="container-x grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Eyebrow>Cleaning & assembly</Eyebrow>
            <h2 id="care-title" className="text-display-3 mt-5">
              Four parts. No tools.
            </h2>
            <ol className="mt-8 space-y-4">
              {[
                "Twist the lid a quarter-turn and lift it off.",
                "Lift out the tray; pop out the inserts you want to swap or wash.",
                "Hand-wash tray and inserts in warm soapy water; dry fully.",
                "Drop the tray onto the keyed indexer, choose the starting chamber, twist the lid back on.",
              ].map((t, i) => (
                <li key={t} className="flex gap-4">
                  <span className="tabular grid size-8 shrink-0 place-items-center rounded-full bg-mint font-semibold">{i + 1}</span>
                  <span className="pt-1 leading-relaxed text-graphite/80">{t}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <Eyebrow>Concept status</Eyebrow>
            <h2 className="text-display-4 mt-5">What&apos;s designed vs. what&apos;s proven</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl bg-mint/50 p-5">
                <p className="flex items-center gap-2 font-medium">
                  <Check size={18} /> Designed & modelled
                </p>
                <ul className="mt-3 space-y-2 text-sm text-forest/80">
                  <li>Mechanism concept and 3D geometry</li>
                  <li>Six insert designs</li>
                  <li>Proposed materials and dimensions</li>
                  <li>Interactive browser simulation</li>
                </ul>
              </div>
              <div className="rounded-2xl bg-coral-200/60 p-5">
                <p className="flex items-center gap-2 font-medium">
                  <Info size={18} /> Not yet validated
                </p>
                <ul className="mt-3 space-y-2 text-sm text-[#6b230b]">
                  <li>Physical prototype of the ratchet</li>
                  <li>Durability, bite and safety testing</li>
                  <li>Dishwasher compatibility</li>
                  <li>Trials with dogs and behaviour professionals</li>
                </ul>
              </div>
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href="/experience" arrow>
                Try the interactive demo
              </ButtonLink>
              <ButtonLink href="/customize" variant="outline">
                Customize yours
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
