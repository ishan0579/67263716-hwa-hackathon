"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { markLoaderDone } from "@/lib/loader-state";

const SKIP_KEY = "so-intro-seen";
const EXIT_MS = 2200;

/** SVG transform pivot in viewBox units. */
const pivot = (x: number, y: number): CSSProperties => ({ transformBox: "view-box", transformOrigin: `${x}px ${y}px` });

/**
 * Branded page loader: a dog sniffs its way to a SniffOrbit puck. Everything
 * (including the exit curtain at 2.2 s) runs on CSS keyframes, so it starts at
 * first paint and can never get stuck if JavaScript is slow or fails. JS only
 * handles Skip and unmounts the overlay afterwards. It lives in the persistent
 * site layout, so client-side navigation never replays it. Skipping remembers
 * the choice for the session; it is never shown with reduced motion (an inline
 * script hides it before first paint).
 */
export function PageLoader() {
  const [mounted, setMounted] = useState(true);
  const [skipped, setSkipped] = useState(false);

  const skipNow = () => {
    try {
      sessionStorage.setItem(SKIP_KEY, "1");
    } catch {}
    setSkipped(true);
    markLoaderDone();
    window.dispatchEvent(new Event("so:loader-done"));
    setTimeout(() => setMounted(false), 400);
  };

  useEffect(() => {
    let skip = false;
    try {
      skip = !!sessionStorage.getItem(SKIP_KEY) || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      /* storage unavailable */
    }
    if (skip) {
      markLoaderDone();
      // Syncing with sessionStorage/media after hydration; the server always renders the loader.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(false);
      return;
    }
    // performance.now() is measured from navigation start, matching the CSS timeline.
    const sinceNav = performance.now();
    const exitAt = Math.max(0, EXIT_MS - sinceNav);
    const t1 = setTimeout(() => {
      markLoaderDone();
      window.dispatchEvent(new Event("so:loader-done"));
    }, exitAt);
    const t2 = setTimeout(() => setMounted(false), exitAt + 1000);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && skipNow();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  if (!mounted) return null;

  return (
    <>
      <div
        id="so-intro"
        data-nav-ignore=""
        data-skipped={skipped ? "" : undefined}
        suppressHydrationWarning
        className="so-loader grain fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-forest text-ivory"
        aria-hidden="true"
      >
              {/* Orbit motif */}
              <div className="absolute left-1/2 top-1/2 size-[130vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-ivory/[0.06]">
                <div className="absolute inset-0 [animation:orbit-spin_12s_linear_infinite]">
                  <span className="absolute left-1/2 top-0 block size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-coral" />
                </div>
              </div>
              <div className="absolute left-1/2 top-1/2 size-[84vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-ivory/[0.06]" />

              <div className="relative flex w-full max-w-[34rem] flex-col items-center px-6">
                <svg viewBox="0 0 360 250" className="w-full max-w-[26rem]" focusable="false">
                  {/* Ground + shadows */}
                  <ellipse cx="160" cy="216" rx="96" ry="9" fill="#061a1c" opacity=".55" />
                  <ellipse cx="300" cy="216" rx="46" ry="7" fill="#061a1c" opacity=".55" />

                  {/* Tail (behind body) */}
                  <path
                    d="M98 192 C 72 188, 60 170, 64 146"
                    fill="none"
                    stroke="#F7F3EA"
                    strokeWidth="14"
                    strokeLinecap="round"
                    className="animate-[dog-wag_0.42s_ease-in-out_infinite]"
                    style={pivot(98, 192)}
                  />

                  {/* Body (breathing) */}
                  <g className="animate-[dog-breathe_2.4s_ease-in-out_infinite]" style={pivot(150, 214)}>
                    <path d="M180 150 L 186 214 L 202 214 L 198 146 Z" fill="#E7DFCF" />
                    <ellipse cx="120" cy="182" rx="44" ry="35" fill="#F7F3EA" />
                    <path d="M100 198 C 86 160, 108 116, 152 108 C 178 104, 194 122, 196 150 L 198 214 L 174 214 L 170 180 C 152 198, 124 206, 100 198 Z" fill="#F7F3EA" />
                    <path d="M120 150 C 132 140, 150 140, 160 150" fill="none" stroke="#E7DFCF" strokeWidth="5" strokeLinecap="round" />
                    <ellipse cx="130" cy="212" rx="26" ry="7" fill="#F7F3EA" />
                    <ellipse cx="188" cy="213" rx="13" ry="5" fill="#F7F3EA" />
                  </g>

                  {/* Head (sniffing), pivot at the neck */}
                  <g className="animate-[dog-sniff_1.8s_ease-in-out_infinite]" style={pivot(176, 120)}>
                    <circle cx="198" cy="92" r="31" fill="#F7F3EA" />
                    <path d="M212 80 C 234 78, 252 86, 254 98 C 255 110, 240 114, 218 112 Z" fill="#F7F3EA" />
                    <path d="M218 112 C 238 113, 252 108, 254 100 C 250 113, 234 119, 216 116 Z" fill="#E7DFCF" />
                    {/* Floppy ear */}
                    <path
                      d="M182 64 C 165 68, 159 97, 169 118 C 175 130, 188 124, 190 112 C 192 96, 196 75, 182 64 Z"
                      fill="#91B7A6"
                      className="animate-[dog-ear_1.8s_ease-in-out_infinite]"
                      style={pivot(184, 66)}
                    />
                    <circle cx="208" cy="86" r="4.2" fill="#20262C" />
                    <circle cx="209.6" cy="84.4" r="1.3" fill="#fff" />
                    <path d="M200 74 q8 -5 17 -1" fill="none" stroke="#20262C" strokeWidth="2.6" strokeLinecap="round" />
                    <path d="M224 112 C 232 114, 240 112, 246 107" fill="none" stroke="#20262C" strokeWidth="2.4" strokeLinecap="round" />
                    <ellipse
                      cx="253"
                      cy="95"
                      rx="8"
                      ry="6.5"
                      fill="#20262C"
                      className="animate-[dog-nose_0.36s_ease-in-out_infinite]"
                      style={pivot(253, 95)}
                    />
                    {/* Collar */}
                    <path d="M170 118 C 182 129, 200 129, 212 119" fill="none" stroke="#FF794B" strokeWidth="8" strokeLinecap="round" />
                    <circle cx="191" cy="130" r="5" fill="#F7F3EA" stroke="#0C3438" strokeWidth="2" />
                  </g>

                  {/* SniffOrbit puck */}
                  <g>
                    <path d="M262 198 v11 a38 10 0 0 0 76 0 v-11" fill="#20262C" />
                    <path d="M262 194 v11 a38 10 0 0 0 76 0 v-11" fill="#E9E2D3" />
                    <ellipse cx="300" cy="194" rx="38" ry="10" fill="#F1EBDD" />
                    <path
                      d="M300 194 L330 188 A38 10 0 0 1 338 196 Z"
                      fill="#FF794B"
                      className="animate-[puck-peek_2.6s_ease-in-out_infinite]"
                      style={pivot(300, 194)}
                    />
                    <ellipse cx="300" cy="194" rx="7" ry="3" fill="#FF794B" />
                  </g>

                  {/* Scent particles drifting to the nose */}
                  {[0, 0.35, 0.7, 1.05, 1.4].map((d, i) => (
                    <circle
                      key={i}
                      cx={298 + (i % 2) * 6}
                      cy={190}
                      r={i % 2 ? 3.2 : 4.2}
                      fill={i === 2 ? "#FF794B" : "#B9E5DB"}
                      className="animate-[scent-rise_1.75s_ease-out_infinite]"
                      style={{ ...pivot(298, 190), animationDelay: `${d}s`, opacity: 0 }}
                    />
                  ))}
                </svg>

                <div className="mt-8 flex flex-col items-center animate-[loader-rise_0.9s_var(--ease-out-expo)_0.15s_both]">
                  <p
                    className="font-display text-4xl font-bold tracking-[-0.035em] sm:text-5xl"
                    style={{ fontVariationSettings: '"wdth" 84, "opsz" 72' }}
                  >
                    SniffOrbit
                  </p>
                  <p className="mt-3 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ivory/60">Sniffing out something new…</p>
                  <div className="mt-6 h-[3px] w-48 overflow-hidden rounded-full bg-ivory/15">
                    <div className="h-full origin-left rounded-full bg-coral animate-[loader-bar_1.9s_var(--ease-in-out-quint)_both]" />
                  </div>
                </div>
              </div>
      </div>
      <button
        id="so-intro-skip"
        data-nav-ignore=""
        data-skipped={skipped ? "" : undefined}
        suppressHydrationWarning
        type="button"
        onClick={skipNow}
        className="so-loader-skip fixed bottom-6 right-6 z-[101] rounded-full border border-ivory/25 px-4 py-2 text-sm font-medium text-ivory hover:bg-white/10"
      >
        Skip intro
      </button>
      <script
        // Hide before first paint when the visitor skipped this session or prefers reduced motion.
        dangerouslySetInnerHTML={{
          __html: `try{if(sessionStorage.getItem("${SKIP_KEY}")||matchMedia("(prefers-reduced-motion: reduce)").matches){["so-intro","so-intro-skip"].forEach(function(i){var e=document.getElementById(i);if(e)e.style.display="none"})}}catch(e){}`,
        }}
      />
    </>
  );
}
