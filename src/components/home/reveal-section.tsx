"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Eyebrow } from "../ui/misc";
import { ProductFallback } from "../three/product-fallback";

const RevealScene = dynamic(() => import("../three/reveal-scene"), {
  ssr: false,
  loading: () => <ProductFallback colorKey="morning-walk" colorHex="#F1EBDD" accentHex="#FF794B" alt="" />,
});

export const REVEAL_CHAPTERS = [
  { at: 0, kicker: "Meet the orbit", title: "A puck-shaped puzzle, built to stay put.", body: "A 28 cm soft-touch shell sits low and wide on a weighted, non-slip elastomer ring — so the challenge stays where the nose expects it." },
  { at: 0.14, kicker: "One door", title: "One window. Six secrets.", body: "There's a single nose-sized window in the lid. A large, spring-loaded shutter slides aside to open it — no fiddly parts, no batteries." },
  { at: 0.3, kicker: "Close, click, rotate", title: "Every close moves the story on.", body: "When the shutter springs back, a ratchet advances the tray by 60°. The next chamber is now waiting behind the very same door." },
  { at: 0.48, kicker: "Layer 01 · Lid & shutter", title: "Scent ports lead the way.", body: "Small ports above every chamber let the nose investigate what's coming before the paws ever get involved." },
  { at: 0.58, kicker: "Layer 02 · Tray", title: "Six chambers, six inserts.", body: "A food-contact tray holds interchangeable inserts — open cup to deep well — so you can set the order and difficulty. It lifts out for washing." },
  { at: 0.68, kicker: "Layer 03 · Indexer", title: "A ratchet, not a motor.", body: "A six-tooth ratchet and stainless pawl turn each shutter stroke into exactly one step. Fully mechanical. Proposed design, not yet prototyped." },
  { at: 0.77, kicker: "Layer 04 · Base", title: "Grounded and weighted.", body: "The housing and elastomer base ring are designed to resist sliding and tipping during enthusiastic play." },
  { at: 0.88, kicker: "Reassembled", title: "Every playtime, a new discovery.", body: "Four parts, assembled tool-free with a twist-lock lid. Ready for the first sniff." },
];

/**
 * Scroll-driven product reveal (Section 4). The 3D scene is pinned while the
 * section scrolls; progress drives the camera, explode and mechanism.
 */
export function RevealSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [chapter, setChapter] = useState(0);
  const [progress, setProgress] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    let idx = 0;
    REVEAL_CHAPTERS.forEach((c, i) => {
      if (p >= c.at) idx = i;
    });
    setChapter((cur) => (cur === idx ? cur : idx));
    setProgress(Math.round(p * 100));
  });

  const c = REVEAL_CHAPTERS[chapter]!;

  return (
    <section
      ref={ref}
      id="reveal"
      data-nav="dark"
      data-surface="dark"
      aria-labelledby="reveal-title"
      className="relative h-[640vh] bg-forest-950 text-ivory"
    >
      <h2 id="reveal-title" className="sr-only">
        How SniffOrbit ONE is built: a scroll-driven reveal
      </h2>
      {/* Screen-reader version of every chapter */}
      <ol className="sr-only">
        {REVEAL_CHAPTERS.map((ch) => (
          <li key={ch.title}>
            {ch.kicker}: {ch.title} {ch.body}
          </li>
        ))}
      </ol>

      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_60%_55%,#134a4f_0%,rgba(6,26,28,0)_70%)]" />
        <RevealScene progress={scrollYProgress} className="absolute inset-0 lg:left-[22%]" />

        <div aria-hidden="true" className="container-x pointer-events-none relative flex h-full flex-col justify-end pb-10 lg:justify-center lg:pb-0">
          <div className="max-w-md rounded-3xl bg-forest-950/70 p-6 backdrop-blur-[2px] lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <Eyebrow index="02" className="text-mint">
              Product reveal
            </Eyebrow>
            <div className="relative mt-6 min-h-[15rem] sm:min-h-[13rem]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={chapter}
                  initial={{ opacity: 0, y: 22, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -14, filter: "blur(6px)" }}
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                >
                  <p className="text-eyebrow text-coral">{c.kicker}</p>
                  <p className="text-display-4 mt-3">{c.title}</p>
                  <p className="mt-4 max-w-[40ch] text-[1.02rem] leading-relaxed text-ivory/75">{c.body}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Progress rail */}
        <div aria-hidden="true" className="absolute right-[clamp(1rem,3vw,2.5rem)] top-1/2 hidden -translate-y-1/2 flex-col items-end gap-3 md:flex">
          {REVEAL_CHAPTERS.map((ch, i) => (
            <span key={ch.title} className="flex items-center gap-3">
              <span className={cn("text-eyebrow transition-opacity duration-500", i === chapter ? "opacity-100" : "opacity-0")}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className={cn("h-px transition-all duration-500", i === chapter ? "w-10 bg-coral" : "w-5 bg-ivory/30")} />
            </span>
          ))}
          <span className="tabular mt-4 font-mono text-[0.7rem] text-ivory/50">{progress}%</span>
        </div>
      </div>
    </section>
  );
}
