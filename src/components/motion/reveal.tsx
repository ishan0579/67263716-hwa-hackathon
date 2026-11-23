"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import { Children, type ReactNode } from "react";
import { useLoaderDone } from "@/lib/loader-state";
import { cn } from "@/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

/** Fades and lifts content into view once. Opacity-only under reduced motion. */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
  amount = 0.25,
  ...rest
}: { children: ReactNode; delay?: number; y?: number; amount?: number } & HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 1, delay, ease }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

const MOTION_TAGS = { h1: motion.h1, h2: motion.h2, h3: motion.h3, p: motion.p, div: motion.div, span: motion.span } as const;

/**
 * Headline with a masked word-by-word rise. The full sentence stays in the DOM
 * as real text, so screen readers and search engines read it normally.
 *
 * The in-view trigger lives on the heading itself — the individual words start
 * clipped inside overflow masks, so an IntersectionObserver on them would never
 * fire. Variants propagate the reveal down to each word.
 */
export function SplitHeadline({
  text,
  as = "h2",
  id,
  className,
  delay = 0,
  stagger = 0.06,
  animateOnMount = false,
  lineClassName,
}: {
  text: string | string[];
  as?: keyof typeof MOTION_TAGS;
  id?: string;
  className?: string;
  delay?: number;
  stagger?: number;
  animateOnMount?: boolean;
  lineClassName?: string | ((i: number) => string);
}) {
  const Tag = MOTION_TAGS[as];
  const loaderDone = useLoaderDone();
  const lines = Array.isArray(text) ? text : [text];
  let wordIndex = 0;
  const trigger = animateOnMount
    ? { animate: loaderDone ? ("show" as const) : ("hidden" as const) }
    : { whileInView: "show" as const, viewport: { once: true, amount: 0.2 } };

  return (
    <Tag id={id} className={className} initial="hidden" {...trigger}>
      {lines.map((line, li) => (
        <span
          key={li}
          className={cn("block", typeof lineClassName === "function" ? lineClassName(li) : lineClassName)}
        >
          {line.split(" ").map((word, wi, arr) => {
            const i = wordIndex++;
            return (
              <span key={wi} className="inline-block overflow-hidden pb-[0.08em] align-bottom -mb-[0.08em]">
                <motion.span
                  className="inline-block will-change-transform"
                  variants={{
                    hidden: { y: "105%" },
                    show: { y: "0%", transition: { duration: 1.05, delay: delay + i * stagger, ease } },
                  }}
                >
                  {word}
                  {wi < arr.length - 1 ? " " : ""}
                </motion.span>
              </span>
            );
          })}
        </span>
      ))}
    </Tag>
  );
}

/** Staggers direct children into view. */
export function Stagger({ children, className, stagger = 0.08 }: { children: ReactNode; className?: string; stagger?: number }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      variants={{ show: { transition: { staggerChildren: stagger } } }}
    >
      {Children.map(children, (child) => (
        <motion.div variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.9, ease } } }}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
