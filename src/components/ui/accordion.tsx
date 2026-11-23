"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Plus } from "./icons";

export type AccordionItem = { id: string; question: string; answer: ReactNode };

/**
 * WAI-ARIA accordion: each header is a <button> with aria-expanded and
 * aria-controls; panels are labelled regions. Multiple panels may be open.
 */
export function Accordion({
  items,
  tone = "light",
  defaultOpen = [],
  className,
}: {
  items: AccordionItem[];
  tone?: "light" | "dark";
  defaultOpen?: string[];
  className?: string;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set(defaultOpen));
  const base = useId();
  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className={cn("border-t hairline", className)}>
      {items.map((item, i) => {
        const isOpen = open.has(item.id);
        const btnId = `${base}-b-${i}`;
        const panelId = `${base}-p-${i}`;
        return (
          <div key={item.id} id={item.id} className="scroll-mt-28 border-b hairline">
            <h3>
              <button
                id={btnId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className="group flex w-full items-center justify-between gap-6 py-6 text-left"
              >
                <span className="text-lg font-medium tracking-[-0.015em] sm:text-xl">{item.question}</span>
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-full border transition-[transform,background-color,border-color] duration-500 ease-[var(--ease-out-expo)]",
                    tone === "dark"
                      ? "border-ivory/20 group-hover:border-ivory/60"
                      : "border-graphite/15 group-hover:border-graphite/50",
                    isOpen && "rotate-45 border-transparent bg-coral text-forest",
                  )}
                  aria-hidden="true"
                >
                  <Plus size={18} />
                </span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div
                    className={cn(
                      "max-w-3xl pb-7 pr-12 text-base leading-relaxed [&_a]:underline [&_a]:underline-offset-4 [&_p+p]:mt-3",
                      tone === "dark" ? "text-ivory/75" : "text-graphite/75",
                    )}
                  >
                    {item.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
