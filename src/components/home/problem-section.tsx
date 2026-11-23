"use client";

import { cosR, sinR } from "@/lib/utils";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";
import { Eyebrow } from "../ui/misc";

/**
 * "Same puzzle. Same trick." — sticky storytelling. As you scroll, a static
 * three-slider puzzle repeats the same solution day after day, then its
 * sliders peel away and the six-chamber orbit takes its place.
 */
export function ProblemSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  return (
    <section ref={ref} id="problem" aria-labelledby="problem-title" className="relative h-[260vh] bg-ivory text-forest" data-nav="light">
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <div className="container-x grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Eyebrow index="01">The problem</Eyebrow>
            <h2 id="problem-title" className="text-display-2 mt-6">
              Same puzzle.
              <br />
              Same trick.
              <br />
              <span className="font-serif-italic font-normal text-forest-500">Not much mystery.</span>
            </h2>
            <ProblemCopy progress={scrollYProgress} />
          </div>
          <div className="relative aspect-square w-full max-w-[640px] justify-self-center lg:col-span-6 lg:col-start-7">
            <PuzzleMorph progress={scrollYProgress} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ProblemCopy({ progress }: { progress: MotionValue<number> }) {
  const a = useTransform(progress, [0, 0.4, 0.5], [1, 1, 0]);
  const b = useTransform(progress, [0.5, 0.62, 1], [0, 1, 1]);
  return (
    <div className="relative mt-8 min-h-[11rem] max-w-[44ch] text-lede text-graphite/80">
      <motion.p style={{ opacity: a }} className="absolute inset-0">
        Many dogs work out a familiar food puzzle quickly. Once the pattern is learned, the same three moves unlock the same reward — every day.
        Variety is one way owners keep enrichment interesting.
      </motion.p>
      <motion.p style={{ opacity: b }} className="absolute inset-0">
        SniffOrbit explores a different idea: not one puzzle, but a <strong className="font-semibold text-forest">sequence of six</strong>,
        revealed one chamber at a time — and rearranged whenever you like.
      </motion.p>
    </div>
  );
}

function PuzzleMorph({ progress }: { progress: MotionValue<number> }) {
  const boardOpacity = useTransform(progress, [0.42, 0.56], [1, 0]);
  const boardScale = useTransform(progress, [0.42, 0.56], [1, 0.85]);
  const orbitOpacity = useTransform(progress, [0.5, 0.64], [0, 1]);
  const orbitRotate = useTransform(progress, [0.5, 1], [-60, 30]);
  const orbitScale = useTransform(progress, [0.5, 0.66], [0.8, 1]);
  const day = useTransform(progress, [0, 0.12, 0.24, 0.36], [1, 2, 3, 4]);
  const slide = useTransform(progress, (p) => {
    // The same three-slide solution plays out again for each "day".
    const local = (p % 0.12) / 0.12;
    return p > 0.42 ? 0 : local;
  });

  return (
    <div className="absolute inset-0">
      {/* Static three-slider board */}
      <motion.div style={{ opacity: boardOpacity, scale: boardScale }} className="absolute inset-[8%] grid place-items-center">
        <div className="relative size-full rounded-[2rem] bg-sand p-[9%] shadow-[inset_0_2px_0_rgba(255,255,255,.6),0_30px_60px_-30px_rgba(12,52,56,.35)]">
          <div className="grid h-full grid-rows-3 gap-[7%]">
            {[0, 1, 2].map((row) => (
              <Slider key={row} row={row} slide={slide} />
            ))}
          </div>
          <DayCounter day={day} />
        </div>
      </motion.div>
      {/* The orbit replaces it */}
      <motion.div style={{ opacity: orbitOpacity, rotate: orbitRotate, scale: orbitScale }} className="absolute inset-[4%]">
        <svg viewBox="0 0 200 200" className="size-full" aria-hidden="true">
          <circle cx="100" cy="100" r="92" fill="#0C3438" />
          <circle cx="100" cy="100" r="92" fill="none" stroke="#B9E5DB" strokeOpacity=".25" strokeWidth=".6" />
          {Array.from({ length: 6 }, (_, i) => {
            const a = ((i * 60 - 90) * Math.PI) / 180;
            const a0 = a - 0.48;
            const a1 = a + 0.48;
            const r0 = 30;
            const r1 = 80;
            const d = `M${100 + r0 * cosR(a0)} ${100 + r0 * sinR(a0)} L${100 + r1 * cosR(a0)} ${100 + r1 * sinR(a0)} A${r1} ${r1} 0 0 1 ${100 + r1 * cosR(a1)} ${100 + r1 * sinR(a1)} L${100 + r0 * cosR(a1)} ${100 + r0 * sinR(a1)} A${r0} ${r0} 0 0 0 ${100 + r0 * cosR(a0)} ${100 + r0 * sinR(a0)} Z`;
            return (
              <g key={i}>
                <path d={d} fill={i === 0 ? "#FF794B" : "#134a4f"} />
                <text
                  x={100 + 56 * cosR(a)}
                  y={100 + 56 * sinR(a) + 4}
                  textAnchor="middle"
                  fontFamily="var(--font-geist-mono)"
                  fontSize="11"
                  fill={i === 0 ? "#0C3438" : "#B9E5DB"}
                >
                  0{i + 1}
                </text>
              </g>
            );
          })}
          <circle cx="100" cy="100" r="20" fill="#F7F3EA" />
          <circle cx="100" cy="100" r="7" fill="#FF794B" />
        </svg>
      </motion.div>
    </div>
  );
}

function Slider({ row, slide }: { row: number; slide: MotionValue<number> }) {
  // Each slider moves in its third of the cycle: row 0, then 1, then 2.
  const x = useTransform(slide, [row / 3, (row + 1) / 3], ["0%", "118%"], { clamp: true });
  return (
    <div className="relative rounded-2xl bg-ivory/80 shadow-[inset_0_2px_6px_rgba(12,52,56,.12)]">
      <div className="absolute inset-y-[18%] left-[10%] w-[34%] rounded-xl bg-forest/10" />
      <motion.div style={{ x }} className="absolute inset-y-[12%] left-[6%] w-[38%] rounded-xl bg-forest shadow-lg">
        <div className="absolute inset-y-[30%] left-1/2 w-[10%] -translate-x-1/2 rounded-full bg-mint/50" />
      </motion.div>
    </div>
  );
}

function DayCounter({ day }: { day: MotionValue<number> }) {
  const text = useTransform(day, (d) => `Day ${Math.min(4, Math.floor(d))} · same 3 moves`);
  return (
    <motion.span className="text-eyebrow absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-forest px-3 py-1.5 text-ivory">
      {text}
    </motion.span>
  );
}
