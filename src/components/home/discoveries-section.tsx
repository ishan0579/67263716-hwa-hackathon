"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRef, useState, type KeyboardEvent } from "react";
import { DIFFICULTY_LABEL, DISCOVERIES } from "@/content/discoveries";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight } from "../ui/icons";
import { Eyebrow } from "../ui/misc";
import { DiscoveryDial } from "./discovery-dial";

/** Section 5 — six discoveries, explorable as an accessible tab interface. */
export function DiscoveriesSection() {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const d = DISCOVERIES[active]!;

  const go = (i: number, focus = false) => {
    const n = (i + 6) % 6;
    setActive(n);
    if (focus) tabs.current[n]?.focus();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      go(active + 1, true);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      go(active - 1, true);
    } else if (e.key === "Home") {
      e.preventDefault();
      go(0, true);
    } else if (e.key === "End") {
      e.preventDefault();
      go(5, true);
    }
  };

  return (
    <section id="discoveries" data-nav="light" aria-labelledby="disc-title" className="relative overflow-hidden bg-cream py-24 text-forest sm:py-32">
      <div className="container-x">
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Eyebrow index="03">Six discoveries</Eyebrow>
            <h2 id="disc-title" className="text-display-2 mt-6">
              Six discoveries.
              <br />
              <span className="font-serif-italic font-normal">One</span> extraordinary toy.
            </h2>
          </div>
          <p className="text-lede self-end text-graphite/75 lg:col-span-4 lg:col-start-9">
            Each chamber holds a different insert. Because inserts are interchangeable, you decide the order — start gentle, finish clever.
          </p>
        </div>

        <div className="mt-16 grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="relative mx-auto w-full max-w-[520px] pt-6 lg:col-span-6">
            <DiscoveryDial active={active} onSelect={(i) => go(i)} />
          </div>

          <div className="lg:col-span-6">
            <div role="tablist" aria-label="Chamber inserts" className="flex flex-wrap gap-2" onKeyDown={onKey}>
              {DISCOVERIES.map((x) => (
                <button
                  key={x.key}
                  ref={(el) => {
                    tabs.current[x.index] = el;
                  }}
                  role="tab"
                  id={`disc-tab-${x.index}`}
                  aria-selected={active === x.index}
                  aria-controls="disc-panel"
                  tabIndex={active === x.index ? 0 : -1}
                  onClick={() => go(x.index)}
                  className={cn(
                    "tabular h-11 rounded-full px-4 text-sm font-medium transition-colors",
                    active === x.index ? "bg-forest text-ivory" : "bg-forest/[0.06] text-forest hover:bg-forest/[0.12]",
                  )}
                >
                  0{x.index + 1}
                  <span className="sr-only"> {x.name}</span>
                </button>
              ))}
            </div>

            <div id="disc-panel" role="tabpanel" aria-labelledby={`disc-tab-${active}`} className="relative mt-10 min-h-[22rem]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={d.key}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <p className="text-eyebrow text-forest-500">
                    Chamber 0{d.index + 1} · {d.insert}
                  </p>
                  <h3 className="text-display-3 mt-3">
                    {d.name}
                    <span className="font-serif-italic block text-[0.55em] font-normal text-graphite/60">{d.title}</span>
                  </h3>
                  <p className="text-lede mt-5 max-w-[46ch] text-graphite/80">{d.description}</p>
                  <dl className="mt-8 grid gap-5 border-t hairline pt-6 sm:grid-cols-2">
                    <div>
                      <dt className="text-eyebrow text-graphite/55">Interaction</dt>
                      <dd className="mt-2 text-[0.95rem] leading-relaxed">{d.interaction}</dd>
                    </div>
                    <div>
                      <dt className="text-eyebrow text-graphite/55">Suggested difficulty</dt>
                      <dd className="mt-2 flex items-center gap-3">
                        <span className="flex gap-1" aria-hidden="true">
                          {[1, 2, 3].map((n) => (
                            <span key={n} className={cn("h-2 w-7 rounded-full", n <= d.difficulty ? "bg-coral" : "bg-forest/10")} />
                          ))}
                        </span>
                        <span className="text-[0.95rem]">{DIFFICULTY_LABEL[d.difficulty]}</span>
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-eyebrow text-graphite/55">Owner note</dt>
                      <dd className="mt-2 text-[0.95rem] leading-relaxed text-graphite/75">{d.ownerNote}</dd>
                    </div>
                  </dl>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <button type="button" onClick={() => go(active - 1)} className="grid size-12 place-items-center rounded-full border border-forest/20 hover:border-forest/60" aria-label="Previous chamber">
                <ArrowLeft size={18} />
              </button>
              <button type="button" onClick={() => go(active + 1)} className="grid size-12 place-items-center rounded-full border border-forest/20 hover:border-forest/60" aria-label="Next chamber">
                <ArrowRight size={18} />
              </button>
              <p className="tabular ml-2 text-sm text-graphite/60" aria-live="polite">
                {active + 1} / 6 — {d.name}
              </p>
            </div>
          </div>
        </div>
        <p className="mt-16 max-w-2xl text-sm text-graphite/60">
          Inserts and interactions are design proposals. They have not yet been tested with dogs; real-world trials would shape the final set.
        </p>
      </div>
    </section>
  );
}
