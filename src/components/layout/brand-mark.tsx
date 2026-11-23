import { cn, cosR, sinR } from "@/lib/utils";

/** The SniffOrbit symbol: an orbit with six chambers, one discovered (coral). */
export function BrandMark({ className, active = 1 }: { className?: string; active?: number }) {
  const beads = Array.from({ length: 6 }, (_, i) => {
    const a = ((-90 + i * 60) * Math.PI) / 180;
    return { x: 24 + 16 * cosR(a), y: 24 + 16 * sinR(a), i };
  });
  return (
    <svg viewBox="0 0 48 48" className={cn("shrink-0", className)} aria-hidden="true" focusable="false">
      <circle cx="24" cy="24" r="16" fill="none" stroke="currentColor" strokeWidth="2.6" />
      <circle cx="24" cy="24" r="4.4" fill="currentColor" />
      {beads.map((b) => (
        <circle
          key={b.i}
          cx={b.x}
          cy={b.y}
          r={b.i === active ? 5 : 3.5}
          fill={b.i === active ? "#FF794B" : "currentColor"}
        />
      ))}
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn("font-display text-[1.32rem] font-bold leading-none tracking-[-0.035em]", className)}
      style={{ fontVariationSettings: '"wdth" 86, "opsz" 32' }}
    >
      SniffOrbit
    </span>
  );
}
