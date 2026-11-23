"use client";

import { animate, useMotionValue, useMotionValueEvent, type MotionValue, type ValueAnimationTransition } from "motion/react";
import { useEffect, useRef, useState, type ReactNode, type SVGProps } from "react";

/**
 * Rotates SVG content about an exact user-space point using the native
 * `transform="rotate(a cx cy)"` attribute. (CSS transforms on SVG compute the
 * pivot from each element's own bounding box, which mis-centres asymmetric
 * groups — the bug this replaces.)
 */
export function SvgRotate({
  deg,
  cx,
  cy,
  transition,
  children,
  ...rest
}: { deg: number; cx: number; cy: number; transition?: ValueAnimationTransition; children: ReactNode } & Omit<SVGProps<SVGGElement>, "transform">) {
  const ref = useRef<SVGGElement>(null);
  const mv = useMotionValue(deg);
  const [initial] = useInitial(deg);

  useEffect(() => {
    const controls = animate(mv, deg, transition ?? { type: "spring", stiffness: 80, damping: 15 });
    return () => controls.stop();
    // Transition objects are recreated each render; only the target should restart the animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deg, mv]);

  useMotionValueEvent(mv, "change", (v) => ref.current?.setAttribute("transform", `rotate(${v} ${cx} ${cy})`));

  return (
    <g ref={ref} transform={`rotate(${initial} ${cx} ${cy})`} {...rest}>
      {children}
    </g>
  );
}

/** Same as SvgRotate, driven by an existing MotionValue (degrees). */
export function SvgRotateValue({
  value,
  cx,
  cy,
  children,
  ...rest
}: { value: MotionValue<number>; cx: number; cy: number; children: ReactNode } & Omit<SVGProps<SVGGElement>, "transform">) {
  const ref = useRef<SVGGElement>(null);
  const [initial] = useInitial(value.get());
  useMotionValueEvent(value, "change", (v) => ref.current?.setAttribute("transform", `rotate(${v} ${cx} ${cy})`));
  return (
    <g ref={ref} transform={`rotate(${initial} ${cx} ${cy})`} {...rest}>
      {children}
    </g>
  );
}

/** Freezes the first value so React never fights the animation over the attribute. */
function useInitial<T>(v: T): [T] {
  const [initial] = useState(v);
  return [initial];
}
