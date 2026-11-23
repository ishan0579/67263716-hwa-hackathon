"use client";

import { motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn, cosR, sinR } from "@/lib/utils";
import { SvgRotate } from "../motion/svg-rotate";

const STEPS = [
  {
    title: "Sniff",
    body: "Scent ports above every chamber let your dog investigate what's coming. Nothing moves yet — the nose does the work.",
    detail: "5 port clusters · window position has no port",
  },
  {
    title: "Slide",
    body: "A nose or paw pushes the shutter around its arc. It's large and smooth so it suits noses, not fingertips. A torsion spring loads as it opens.",
    detail: "Shutter travel ≈ 64° · spring-loaded (proposed)",
  },
  {
    title: "Discover",
    body: "With the window open, the chamber beneath is reachable. Some inserts need a second move — lift the flap, tip the dome.",
    detail: "One chamber exposed at a time",
  },
  {
    title: "Click",
    body: "Released, the spring snaps the shutter shut. On that return stroke a pawl pushes the ratchet one tooth: the tray turns 60° and the next chamber arrives.",
    detail: "Partial strokes don't index — a full push is required",
  },
];

/** Ratchet, pawl, spring and shutter — animated to the active step. */
function MechanismDiagram({ step }: { step: number }) {
  const shutter = step === 1 || step === 2 ? 64 : 0;
  const ratchet = step === 3 ? -60 : 0;
  const pawl = step === 3 ? -14 : step >= 1 ? 8 : 0;
  const teeth = Array.from({ length: 6 }, (_, i) => {
    const b = (i * 60 * Math.PI) / 180;
    const p = (r: number, a: number) => `${200 + r * sinR(a)},${200 - r * cosR(a)}`;
    return [p(96, b), p(124, b + (49 * Math.PI) / 180), p(96, b + (50 * Math.PI) / 180)].join(" ");
  });
  return (
    <svg viewBox="0 0 400 400" className="w-full" role="img" aria-label={`Mechanism diagram — step ${step + 1}: ${STEPS[step]!.title}`}>
      <circle cx="200" cy="200" r="190" fill="#082629" />
      <circle cx="200" cy="200" r="178" fill="none" stroke="#B9E5DB" strokeOpacity=".15" strokeDasharray="2 6" />
      {/* Ratchet wheel (turns with the tray) */}
      <SvgRotate deg={ratchet} cx={200} cy={200} transition={{ type: "spring", stiffness: 80, damping: 12, delay: step === 3 ? 0.45 : 0 }}>
        <polygon points={teeth.join(" ")} fill="#3A424A" stroke="#B9E5DB" strokeOpacity=".4" strokeWidth="1.5" />
        <circle cx="200" cy="200" r="58" fill="#082629" stroke="#B9E5DB" strokeOpacity=".3" />
        {Array.from({ length: 6 }, (_, i) => {
          const a = ((i * 60 + 25) * Math.PI) / 180;
          return (
            <text key={i} x={200 + 76 * sinR(a)} y={200 - 76 * cosR(a) + 4} textAnchor="middle" fontSize="11" fill="#B9E5DB" fontFamily="var(--font-geist-mono)">
              0{i + 1}
            </text>
          );
        })}
      </SvgRotate>
      {/* Pawl + spring */}
      <SvgRotate deg={pawl} cx={300} cy={110} transition={{ type: "spring", stiffness: 140, damping: 14 }}>
        <path d="M300 110 L232 92 L236 104 Z" fill="#C9D0D6" />
        <circle cx="300" cy="110" r="7" fill="#C9D0D6" />
      </SvgRotate>
      <motion.path
        d="M306 118 l10 8 l-12 6 l12 6 l-12 6 l12 6 l-12 6 l10 8"
        fill="none"
        stroke="#C9D0D6"
        strokeWidth="2.5"
        strokeLinejoin="round"
        animate={{ scaleY: step === 1 || step === 2 ? 1.18 : 1 }}
        style={{ originY: 0 }}
      />
      {/* Shutter (outer arc) */}
      <SvgRotate deg={shutter} cx={200} cy={200} transition={{ type: "spring", stiffness: step === 3 ? 220 : 90, damping: step === 3 ? 13 : 16 }}>
        <path d="M200 200 L148 38 A170 170 0 0 1 252 38 Z" fill="#FF794B" fillOpacity=".92" />
        <path d="M168 58 A150 150 0 0 1 232 58" stroke="#0C3438" strokeOpacity=".3" strokeWidth="6" fill="none" strokeLinecap="round" />
      </SvgRotate>
      <circle cx="200" cy="200" r="30" fill="#FF794B" />
      <circle cx="200" cy="200" r="18" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="2" />
      {/* Window marker + scent pulse */}
      <path d="M176 8 L224 8 L212 24 L188 24 Z" fill="#F7F3EA" />
      {step === 0 &&
        [60, 120, 180, 240, 300].map((d) => {
          const a = (d * Math.PI) / 180;
          return (
            <motion.circle
              key={d}
              cx={200 + 150 * sinR(a)}
              cy={200 - 150 * cosR(a)}
              r="6"
              fill="#B9E5DB"
              animate={{ scale: [1, 2.2, 1], opacity: [0.9, 0, 0.9] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: d / 400 }}
            />
          );
        })}
      {step === 2 && (
        <motion.g initial={{ scale: 0 }} animate={{ scale: 1 }}>
          <ellipse cx="200" cy="70" rx="14" ry="10" fill="#A0612F" />
          <ellipse cx="216" cy="78" rx="9" ry="7" fill="#8A5227" />
        </motion.g>
      )}
    </svg>
  );
}

function Step({ i, onActive, active }: { i: number; onActive: (i: number) => void; active: boolean }) {
  const ref = useRef<HTMLLIElement>(null);
  const inView = useInView(ref, { margin: "-45% 0px -45% 0px" });
  useEffect(() => {
    if (inView) onActive(i);
  }, [inView, i, onActive]);
  const s = STEPS[i]!;
  return (
    <li ref={ref} className={cn("min-h-[60svh] border-l-2 py-10 pl-8 transition-colors duration-500 lg:min-h-[70svh]", active ? "border-coral" : "border-ivory/10")}>
      <p className="text-eyebrow text-mint">Step 0{i + 1}</p>
      <h3 className="text-display-3 mt-4">{s.title}</h3>
      <p className="text-lede mt-5 max-w-[42ch] text-ivory/75">{s.body}</p>
      <p className="mt-5 font-mono text-xs uppercase tracking-[0.14em] text-ivory/45">{s.detail}</p>
    </li>
  );
}

export function MechanismStory() {
  const [active, setActive] = useState(0);
  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <div className="sticky top-24 mx-auto max-w-md pt-6 lg:max-w-none">
          <MechanismDiagram step={active} />
          <div className="mt-6 flex justify-center gap-2" aria-hidden="true">
            {STEPS.map((s, i) => (
              <span key={s.title} className={cn("h-1.5 rounded-full transition-all duration-500", i === active ? "w-10 bg-coral" : "w-4 bg-ivory/20")} />
            ))}
          </div>
        </div>
      </div>
      <ol className="lg:col-span-6 lg:col-start-7">
        {STEPS.map((s, i) => (
          <Step key={s.title} i={i} onActive={setActive} active={active === i} />
        ))}
      </ol>
    </div>
  );
}
