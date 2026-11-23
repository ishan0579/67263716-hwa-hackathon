"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { NoseAndKibble, PawOnShutter, SniffingDog } from "../illustrations/dogs";
import { Reveal } from "../motion/reveal";
import { Eyebrow } from "../ui/misc";

const PANELS = [
  {
    key: "curiosity",
    label: "Curiosity",
    title: "The nose leads.",
    body: "Scent ports invite investigation before anything moves — sniffing is where the game begins.",
    Art: SniffingDog,
    alt: "Illustration of a dog in profile following scent trails toward the puzzle.",
    speed: -24,
    className: "lg:col-span-4",
  },
  {
    key: "exploration",
    label: "Exploration",
    title: "Paws get involved.",
    body: "A shutter big enough for a nose or a paw rewards confident, curious movement.",
    Art: PawOnShutter,
    alt: "Illustration of a paw pushing the coral shutter, seen from above.",
    speed: 18,
    className: "lg:col-span-4 lg:mt-28",
  },
  {
    key: "connection",
    label: "Connection",
    title: "You're part of the game.",
    body: "You load the chambers, choose the order and watch the discoveries unfold — mealtime becomes time together.",
    Art: NoseAndKibble,
    alt: "Illustration of a dog's nose meeting a piece of kibble offered from a hand.",
    speed: -12,
    className: "lg:col-span-4 lg:mt-56",
  },
];

/** Section 7 — emotional storytelling with original illustrations. */
export function CuriousDogsSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  return (
    <section ref={ref} data-nav="light" aria-labelledby="curious-title" className="relative overflow-hidden bg-ivory py-24 text-forest sm:py-36">
      <div className="container-x">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <Eyebrow index="05">Built for curious dogs</Eyebrow>
            <h2 id="curious-title" className="text-display-2 mt-6">
              Made for curious noses <span className="font-serif-italic font-normal text-forest-500">and busy minds.</span>
            </h2>
          </div>
          <Reveal className="self-end lg:col-span-4 lg:col-start-9">
            <p className="text-lede text-graphite/75">
              Dogs explore the world nose-first. SniffOrbit is designed around that instinct: sniff, nudge, slide, discover — then do it again,
              differently.
            </p>
          </Reveal>
        </div>

        <div className="mt-20 grid gap-14 sm:grid-cols-2 lg:grid-cols-12 lg:gap-10">
          {PANELS.map((p, i) => (
            <Panel key={p.key} p={p} i={i} progress={scrollYProgress} />
          ))}
          <Reveal className="sm:col-span-2 lg:col-span-12 lg:mt-8">
            <ul className="grid gap-4 border-t hairline pt-8 text-[0.98rem] text-graphite/75 md:grid-cols-3 md:gap-8">
              <li className="flex gap-3">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-coral" />
                Designed for supervised play and dry food — not for chewing.
              </li>
              <li className="flex gap-3">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-coral" />
                Every dog is different: start gentle, watch, and adjust the inserts.
              </li>
              <li className="flex gap-3">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-coral" />
                No claims of guaranteed engagement time — just a more varied puzzle to explore together.
              </li>
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Panel({
  p,
  i,
  progress,
}: {
  p: (typeof PANELS)[number];
  i: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const y = useTransform(progress, [0, 1], [p.speed, -p.speed]);
  const Art = p.Art;
  return (
    <motion.figure style={{ y }} className={p.className}>
      <Reveal delay={i * 0.08}>
        <div className="grain relative overflow-hidden rounded-[var(--radius-panel)]">
          <motion.div initial={{ scale: 1.12 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}>
            <Art className="aspect-square w-full" title={p.alt} />
          </motion.div>
        </div>
        <figcaption className="mt-5">
          <p className="text-eyebrow text-forest-500">
            0{i + 1} — {p.label}
          </p>
          <p className="text-display-4 mt-2">{p.title}</p>
          <p className="mt-2 max-w-[40ch] text-graphite/70">{p.body}</p>
        </figcaption>
      </Reveal>
    </motion.figure>
  );
}
