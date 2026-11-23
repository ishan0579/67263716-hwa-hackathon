"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { DISCOVERIES } from "@/content/discoveries";
import { cn } from "@/lib/utils";
import { InsertGlyph } from "../home/discovery-dial";
import { SniffingDog } from "../illustrations/dogs";
import { Button, ButtonLink } from "../ui/button";
import { Alert, ArrowLeft, Check, Rotate } from "../ui/icons";
import { evaluate, QUESTIONS, type Answers } from "./rules";

export function DogMatchQuiz() {
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState<Answers>({});
  const [dir, setDir] = useState(1);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const total = QUESTIONS.length;
  const done = step >= total;
  const q = QUESTIONS[step];

  useEffect(() => {
    if (step >= 0) headingRef.current?.focus();
  }, [step]);

  const go = (n: number) => {
    setDir(n > step ? 1 : -1);
    setStep(n);
  };

  const choose = (value: string) => {
    if (!q) return;
    if (q.multi) {
      const cur = (answers.considerations ?? []) as string[];
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      setAnswers({ ...answers, considerations: next as Answers["considerations"] });
    } else {
      setAnswers({ ...answers, [q.id]: value });
      setTimeout(() => go(step + 1), 260);
    }
  };

  const result = done ? evaluate(answers) : null;

  if (step === -1) {
    return (
      <div className="grid items-center gap-12 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <p className="text-lede max-w-[46ch] text-graphite/80">
            Seven quick questions about your dog. We&apos;ll suggest a size and a starting difficulty — and explain exactly why, using simple rules
            you can read. No sign-up, nothing stored.
          </p>
          <ul className="mt-8 space-y-3 text-graphite/75">
            {["About 2 minutes", "Transparent, rule-based suggestions", "Applies straight to the configurator"].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="grid size-6 place-items-center rounded-full bg-mint text-forest">
                  <Check size={14} />
                </span>
                {t}
              </li>
            ))}
          </ul>
          <Button size="lg" className="mt-10" arrow onClick={() => go(0)}>
            Start Dog Match
          </Button>
        </div>
        <div className="lg:col-span-5 lg:col-start-8">
          <div className="grain relative overflow-hidden rounded-[2.5rem]">
            <SniffingDog className="aspect-square w-full" title="Illustration of a curious dog sniffing toward a SniffOrbit puzzle." />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-10 flex items-center gap-4">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-forest/10"
          role="progressbar"
          aria-label="Quiz progress"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={Math.min(step, total)}
        >
          <motion.div className="h-full rounded-full bg-coral" animate={{ width: `${(Math.min(step, total) / total) * 100}%` }} transition={{ duration: 0.5 }} />
        </div>
        <span className="tabular text-sm text-graphite/60">{done ? "Done" : `${step + 1} / ${total}`}</span>
      </div>

      <AnimatePresence mode="wait" custom={dir}>
        {!done && q ? (
          <motion.fieldset
            key={q.id}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -30 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="min-h-[24rem]"
          >
            <legend className="contents">
              <h2 ref={headingRef} tabIndex={-1} className="text-display-3 max-w-[20ch] outline-none">
                {q.title}
              </h2>
            </legend>
            {q.help && <p className="mt-3 text-graphite/65">{q.help}</p>}
            <div className={cn("mt-10 grid gap-3", q.options.length === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3")} role={q.multi ? "group" : "radiogroup"}>
              {q.options.map((o) => {
                const selected = q.multi ? (answers.considerations ?? []).includes(o.value as never) : answers[q.id] === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role={q.multi ? "checkbox" : "radio"}
                    aria-checked={selected}
                    onClick={() => choose(o.value)}
                    className={cn(
                      "group relative flex min-h-28 flex-col items-start justify-between rounded-2xl border p-5 text-left transition-[background-color,border-color,transform] duration-300 hover:-translate-y-0.5",
                      selected ? "border-forest bg-forest text-ivory" : "border-forest/15 bg-white/60 hover:border-forest/40",
                    )}
                  >
                    <span className={cn("grid size-6 place-items-center rounded-full border transition-colors", selected ? "border-coral bg-coral text-forest" : "border-forest/25")}>
                      {selected && <Check size={14} />}
                    </span>
                    <span>
                      <span className="block text-lg font-medium">{o.label}</span>
                      {o.detail && <span className={cn("mt-0.5 block text-sm", selected ? "text-ivory/70" : "text-graphite/60")}>{o.detail}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-10 flex items-center justify-between">
              <button type="button" onClick={() => go(step - 1)} className="inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline">
                <ArrowLeft size={16} /> Back
              </button>
              {q.multi && (
                <Button onClick={() => go(step + 1)} arrow>
                  {(answers.considerations ?? []).length ? "See my match" : "None of these — see my match"}
                </Button>
              )}
            </div>
          </motion.fieldset>
        ) : result ? (
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h2 ref={headingRef} tabIndex={-1} className="text-display-2 outline-none">
              {result.suitable ? (
                <>
                  Your match: <span className="font-serif-italic font-normal text-forest-500">{result.size === "large" ? "Large" : "Standard"}</span>, {result.levelName}{" "}
                  start.
                </>
              ) : (
                <>We&apos;d hold off for now.</>
              )}
            </h2>

            <div className="mt-12 grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-7">
                {!result.suitable && (
                  <div role="alert" className="mb-8 flex gap-3 rounded-2xl bg-coral-200/70 p-5 text-[#6b230b]">
                    <Alert size={22} className="shrink-0" />
                    <p>{result.cautions[0]}</p>
                  </div>
                )}
                <h3 className="text-eyebrow text-graphite/55">Why we suggest this</h3>
                <ul className="mt-4 space-y-3">
                  {result.reasons.map((r) => (
                    <li key={r} className="flex gap-3 text-[1.02rem] leading-relaxed">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-coral" />
                      {r}
                    </li>
                  ))}
                </ul>
                <h3 className="text-eyebrow mt-10 text-graphite/55">Suggested insert order</h3>
                <ol className="mt-4 flex flex-wrap gap-2">
                  {result.order.map((idx, pos) => (
                    <li key={idx} className="flex items-center gap-2 rounded-full bg-white/70 py-1.5 pl-1.5 pr-3.5 text-sm ring-1 ring-forest/10">
                      <span className="tabular grid size-6 place-items-center rounded-full bg-forest text-[0.7rem] font-semibold text-ivory">{pos + 1}</span>
                      <svg viewBox="-14 -14 28 28" className="size-4 text-forest" aria-hidden="true">
                        <InsertGlyph index={idx} />
                      </svg>
                      {DISCOVERIES[idx]!.name}
                    </li>
                  ))}
                </ol>
              </div>
              <aside className="lg:col-span-5">
                <div className="rounded-[var(--radius-panel)] bg-sand/70 p-6">
                  <h3 className="flex items-center gap-2 font-medium">
                    <Alert size={18} /> Things to keep in mind
                  </h3>
                  <ul className="mt-4 space-y-3 text-sm leading-relaxed text-graphite/80">
                    {result.cautions.slice(result.suitable ? 0 : 1).map((c) => (
                      <li key={c} className="flex gap-2.5">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-forest" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6 flex flex-col gap-3">
                  {result.suitable ? (
                    <ButtonLink href={`/customize?size=${result.size}&level=${result.level}&from=match`} size="lg" arrow>
                      Apply to configurator
                    </ButtonLink>
                  ) : (
                    <ButtonLink href="/faq#chewers" size="lg" variant="dark" arrow>
                      Read our safety guidance
                    </ButtonLink>
                  )}
                  <Button variant="outline" onClick={() => { setAnswers({}); go(0); }} icon={<Rotate size={16} />}>
                    Start over
                  </Button>
                </div>
              </aside>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
