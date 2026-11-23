"use client";

import { motion } from "motion/react";

/** Closing brand moment: the wordmark rises letter by letter as the footer enters. */
export function FooterWordmark() {
  const letters = "SNIFFORBIT".split("");
  return (
    <div className="relative mt-10 select-none overflow-hidden" aria-hidden="true">
      <div
        className="flex justify-between px-[1.5vw] font-display font-bold leading-[0.78] tracking-[-0.06em] text-ivory"
        style={{ fontSize: "clamp(4rem, 18.6vw, 22rem)", fontVariationSettings: '"wdth" 75, "opsz" 96' }}
      >
        {letters.map((l, i) => (
          <motion.span
            key={i}
            initial={{ y: "70%", opacity: 0 }}
            whileInView={{ y: "12%", opacity: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1.1, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            className={i === 5 ? "relative inline-block" : "inline-block"}
          >
            {i === 5 ? (
              <>
                <span className="invisible">O</span>
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="relative block aspect-square w-[78%] rounded-full border-[0.11em] border-ivory">
                    <span className="absolute inset-0 [animation:orbit-spin_14s_linear_infinite]">
                      <span className="absolute left-1/2 top-0 block size-[0.2em] -translate-x-1/2 -translate-y-1/2 rounded-full bg-coral" />
                    </span>
                  </span>
                </span>
              </>
            ) : (
              l
            )}
          </motion.span>
        ))}
      </div>
    </div>
  );
}
