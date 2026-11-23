"use client";

import { motion } from "motion/react";
import dynamic from "next/dynamic";
import { ButtonLink } from "../ui/button";
import { ArrowDown } from "../ui/icons";
import { Magnetic } from "../motion/magnetic";
import { SplitHeadline } from "../motion/reveal";
import { ProductFallback } from "../three/product-fallback";
import { useLoaderDone } from "@/lib/loader-state";

const HeroScene = dynamic(() => import("../three/hero-scene"), {
  ssr: false,
  loading: () => (
    <ProductFallback colorKey="morning-walk" colorHex="#F1EBDD" accentHex="#FF794B" priority alt="" sizes="(max-width: 768px) 100vw, 60vw" />
  ),
});

const ease = [0.16, 1, 0.3, 1] as const;

const CHIPS = [
  { label: "06", text: "treat chambers", className: "left-[8%] top-[44%]", line: "w-16" },
  { label: "↻", text: "spring-return shutter", className: "right-[9%] top-[36%]", line: "w-20" },
  { label: "0", text: "batteries · fully mechanical", className: "left-[15%] top-[60%] flex-row-reverse", line: "w-12" },
];

export function Hero({ priceFrom }: { priceFrom: string }) {
  const ready = useLoaderDone();
  return (
    <section
      data-nav="dark"
      data-surface="dark"
      aria-labelledby="hero-title"
      className="grain relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-forest text-ivory"
    >
      {/* Studio light + orbit motif */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[58%] h-[85vh] w-[120vw] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(closest-side,#1d5f65_0%,rgba(12,52,56,0)_100%)] opacity-90" />
        <svg className="absolute left-1/2 top-[56%] h-[150vmin] w-[150vmin] -translate-x-1/2 -translate-y-1/2 [animation:orbit-spin_90s_linear_infinite]" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="49.6" fill="none" stroke="#F7F3EA" strokeOpacity=".07" strokeWidth=".12" />
          <circle cx="50" cy="0.4" r=".55" fill="#B9E5DB" fillOpacity=".5" />
          <circle cx="50" cy="50" r="36" fill="none" stroke="#F7F3EA" strokeOpacity=".05" strokeWidth=".1" strokeDasharray=".4 1.2" />
        </svg>
      </div>

      <div className="container-x relative flex flex-1 flex-col pb-8 pt-28 sm:pt-32">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={ready ? { opacity: 1, y: 0 } : undefined}
          transition={{ delay: 0.25, duration: 0.9, ease }}
          className="text-eyebrow flex items-center gap-3 text-mint"
        >
          <span className="inline-block size-1.5 rounded-full bg-coral" />
          SniffOrbit ONE · enrichment puzzle concept
        </motion.p>

        <h1 id="hero-title" className="sr-only">
          Playtime has a plot twist. Meet SniffOrbit ONE.
        </h1>
        <div aria-hidden="true" className="relative mt-5 flex-1">
          <SplitHeadline
            as="p"
            animateOnMount
            delay={0.35}
            text="PLAYTIME HAS"
            className="text-display-1 relative z-0"
          />
          {/* 3D product sits between the two headline lines for depth */}
          <div className="pointer-events-none absolute inset-x-[-6%] top-[2%] bottom-[-4%] z-10 sm:inset-x-[4%] lg:inset-x-[14%]">
            <HeroScene className="size-full" />
          </div>
          <SplitHeadline
            as="p"
            animateOnMount
            delay={0.55}
            text="A PLOT TWIST."
            className="text-display-1 relative z-20 mt-[34vh] text-right sm:mt-[30vh] lg:mt-[24vh]"
          />

          {CHIPS.map((c, i) => (
            <motion.div
              key={c.text}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={ready ? { opacity: 1, scale: 1 } : undefined}
              transition={{ delay: 1.4 + i * 0.15, duration: 0.8, ease }}
              className={`absolute z-30 hidden items-center gap-3 lg:flex ${c.className}`}
            >
              <span className="flex items-center gap-2 rounded-full border border-ivory/15 bg-forest-900/60 py-1.5 pl-1.5 pr-3.5 text-[0.8rem] backdrop-blur-sm">
                <span className="tabular grid size-7 place-items-center rounded-full bg-mint text-[0.72rem] font-semibold text-forest">
                  {c.label}
                </span>
                {c.text}
              </span>
              <span className={`h-px bg-ivory/30 ${c.line}`} />
            </motion.div>
          ))}
        </div>

        <div className="relative z-30 mt-8 grid items-end gap-8 lg:grid-cols-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={ready ? { opacity: 1, y: 0 } : undefined}
            transition={{ delay: 0.9, duration: 1, ease }}
            className="lg:col-span-5"
          >
            <p className="text-lede max-w-[40ch] text-ivory/80">
              Meet SniffOrbit ONE. A new kind of enrichment puzzle designed to turn every discovery into another adventure.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Magnetic>
                <ButtonLink href="#reveal" size="lg" arrow>
                  Explore SniffOrbit
                </ButtonLink>
              </Magnetic>
              <ButtonLink href="/how-it-works" size="lg" variant="outline">
                See how it works
              </ButtonLink>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={ready ? { opacity: 1 } : undefined}
            transition={{ delay: 1.3, duration: 1 }}
            className="flex items-end justify-between gap-6 lg:col-span-7 lg:justify-end"
          >
            <p className="text-sm text-ivory/60">
              From <span className="tabular font-medium text-ivory">{priceFrom}</span> · concept demo store
            </p>
            <a href="#problem" className="group flex items-center gap-3 text-sm text-ivory/70 hover:text-ivory">
              <span className="relative h-10 w-px overflow-hidden bg-ivory/20">
                <span className="absolute inset-x-0 top-0 h-1/2 bg-coral [animation:scroll-cue_2s_var(--ease-in-out-quint)_infinite]" />
              </span>
              <span className="hidden sm:inline">Scroll to discover</span>
              <ArrowDown size={16} className="sm:hidden" />
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
