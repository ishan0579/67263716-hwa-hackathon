"use client";

import { cosR, sinR } from "@/lib/utils";
import { SvgRotate } from "../motion/svg-rotate";
import { DISCOVERIES } from "@/content/discoveries";

/** Small pictograms for each insert, drawn around (0,0). */
export function InsertGlyph({ index, color = "currentColor" }: { index: number; color?: string }) {
  switch (index) {
    case 0:
      return <circle r="9" fill="none" stroke={color} strokeWidth="2.4" />;
    case 1:
      return (
        <g stroke={color} strokeWidth="2.4" strokeLinecap="round">
          <path d="M-10 -7h20M-10 0h20M-10 7h20" />
        </g>
      );
    case 2:
      return (
        <g fill={color}>
          {[
            [0, 0],
            [-8, -7],
            [8, -7],
            [-8, 7],
            [8, 7],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.6" />
          ))}
        </g>
      );
    case 3:
      return <path d="M-11 6 L9 -6 M-11 6 h20" stroke={color} strokeWidth="2.4" strokeLinecap="round" fill="none" />;
    case 4:
      return (
        <g>
          <path d="M-11 5 A11 11 0 0 1 11 5 Z" fill={color} />
          <circle cy="-9" r="2" fill={color} />
        </g>
      );
    default:
      return (
        <g fill="none" stroke={color} strokeWidth="2.2">
          <circle r="10" />
          <circle r="4.5" />
        </g>
      );
  }
}

/**
 * Top-down diagram of the tray. The active chamber rotates to the window at
 * 12 o'clock — the same way the real ratchet presents one chamber at a time.
 */
export function DiscoveryDial({ active, onSelect }: { active: number; onSelect: (i: number) => void }) {
  const R0 = 64;
  const R1 = 168;
  return (
    <svg viewBox="0 0 400 400" className="size-full overflow-visible" role="group" aria-label="Tray diagram — choose a chamber">
      <circle cx="200" cy="200" r="194" fill="#0C3438" />
      <circle cx="200" cy="200" r="180" fill="#E5F8F5" />
      <SvgRotate deg={-active * 60} cx={200} cy={200} transition={{ type: "spring", stiffness: 70, damping: 16 }}>
        {DISCOVERIES.map((d) => {
          const a = ((d.index * 60 - 90) * Math.PI) / 180;
          const a0 = a - 0.5;
          const a1 = a + 0.5;
          const p = (r: number, ang: number) => `${200 + r * cosR(ang)} ${200 + r * sinR(ang)}`;
          const path = `M${p(R0, a0)} L${p(R1, a0)} A${R1} ${R1} 0 0 1 ${p(R1, a1)} L${p(R0, a1)} A${R0} ${R0} 0 0 0 ${p(R0, a0)} Z`;
          const isActive = d.index === active;
          const cx = 200 + 118 * cosR(a);
          const cy = 200 + 118 * sinR(a);
          return (
            <g
              key={d.key}
              onClick={() => onSelect(d.index)}
              className="cursor-pointer"
              aria-hidden="true"
            >
              <path d={path} fill={isActive ? "#FF794B" : "#B9E5DB"} className="transition-[fill] duration-500" />
              <path d={path} fill="none" stroke="#0C3438" strokeOpacity=".12" />
              <g transform={`translate(${cx} ${cy}) rotate(${d.index * 60})`}>
                <InsertGlyph index={d.index} color={isActive ? "#0C3438" : "#134a4f"} />
              </g>
              <text
                x={200 + 152 * cosR(a)}
                y={200 + 152 * sinR(a)}
                textAnchor="middle"
                dominantBaseline="middle"
                fontFamily="var(--font-geist-mono)"
                fontSize="11"
                fill="#0C3438"
                opacity={isActive ? 1 : 0.55}
                transform={`rotate(${d.index * 60} ${200 + 152 * cosR(a)} ${200 + 152 * sinR(a)})`}
              >
                0{d.index + 1}
              </text>
            </g>
          );
        })}
      </SvgRotate>
      <circle cx="200" cy="200" r="54" fill="#F7F3EA" />
      <circle cx="200" cy="200" r="20" fill="#FF794B" />
      {/* Fixed window marker at 12 o'clock */}
      <path d="M170 6 L230 6 L214 26 L186 26 Z" fill="#FF794B" />
      <text x="200" y="-10" textAnchor="middle" fontFamily="var(--font-geist-mono)" fontSize="10" letterSpacing="2" fill="currentColor">
        WINDOW
      </text>
    </svg>
  );
}
