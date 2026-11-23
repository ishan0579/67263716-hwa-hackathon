"use client";

import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useReducer, useRef } from "react";
import { DISCOVERIES } from "@/content/discoveries";
import { cn, cosR, sinR } from "@/lib/utils";
import { InsertGlyph } from "../home/discovery-dial";
import { SvgRotateValue } from "../motion/svg-rotate";
import { Button } from "../ui/button";
import { Check, Eye, Play, Rotate } from "../ui/icons";
import {
  canRetrieve,
  chamberAtPort,
  foundCount,
  initialSimState,
  isWindowOpen,
  loadedCount,
  needsPreparation,
  OPEN_THRESHOLD,
  preparationVerb,
  simReducer,
} from "./engine";

const OPEN_DEG = 64;
const C = 200;

const pt = (r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [C + r * cosR(a), C + r * sinR(a)] as const;
};
function sector(r0: number, r1: number, d0: number, d1: number) {
  const [x0, y0] = pt(r1, d0);
  const [x1, y1] = pt(r1, d1);
  const [x2, y2] = pt(r0, d1);
  const [x3, y3] = pt(r0, d0);
  const large = d1 - d0 > 180 ? 1 : 0;
  return `M${x0} ${y0} A${r1} ${r1} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${r0} ${r0} 0 ${large} 0 ${x3} ${y3} Z`;
}

/**
 * Interactive concept demonstration of the SniffOrbit mechanism. All state is
 * real (see engine.ts): loading, start position, shutter travel, ratchet
 * indexing, insert actions, scent ports, progress and replay.
 */
export function PuzzleSimulation({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  const [s, dispatch] = useReducer(simReducer, undefined, initialSimState);
  const shutterMv = useMotionValue(0);
  const shutterDeg = useTransform(shutterMv, (v) => v * OPEN_DEG);
  const trayDeg = useMotionValue(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const trayTurns = useRef(0);

  // Keep the visual shutter in sync with state; spring back on release.
  useEffect(() => {
    if (dragging.current) shutterMv.set(s.shutter);
    else animate(shutterMv, s.shutter, s.shutter === 0 ? { type: "spring", stiffness: 260, damping: 18 } : { duration: 0.15 });
  }, [s.shutter, shutterMv]);

  // Tray rotation: always rotate forward (one step = -60°).
  useEffect(() => {
    const current = trayTurns.current;
    const targetMod = s.trayPos;
    const curMod = ((current % 6) + 6) % 6;
    let diff = targetMod - curMod;
    if (s.phase === "setup") {
      if (diff > 3) diff -= 6;
      if (diff < -3) diff += 6;
    } else if (diff < 0) diff += 6;
    trayTurns.current = current + diff;
    animate(trayDeg, -trayTurns.current * 60, { type: "spring", stiffness: 90, damping: 15, delay: s.phase === "setup" ? 0 : 0.18 });
  }, [s.trayPos, s.phase, trayDeg]);

  const open = isWindowOpen(s);
  const current = s.chambers[s.trayPos]!;
  const dark = tone === "dark";
  const loaded = loadedCount(s);
  const found = foundCount(s);

  const angleFromPointer = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return 0;
    const r = svg.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * 400 - C;
    const y = ((clientY - r.top) / r.height) * 400 - C;
    let deg = (Math.atan2(y, x) * 180) / Math.PI + 90;
    if (deg > 180) deg -= 360;
    return Math.max(0, Math.min(1, deg / OPEN_DEG));
  };

  const elapsed = s.startedAt && s.finishedAt ? Math.round((s.finishedAt - s.startedAt) / 1000) : null;

  return (
    <div className={cn("grid gap-10 lg:grid-cols-12 lg:items-center", className)}>
      {/* Toy */}
      <div className="relative mx-auto w-full max-w-[520px] lg:col-span-6">
        <svg
          ref={svgRef}
          viewBox="0 0 400 400"
          className="w-full touch-none select-none overflow-visible"
          role="img"
          aria-label={`Top view of the puzzle. Chamber 0${s.trayPos + 1} (${DISCOVERIES[s.trayPos]!.name}) is under the window. Shutter ${Math.round(s.shutter * 100)}% open.`}
        >
          <defs>
            <clipPath id="sim-window">
              <path d={sector(52, 166, -26, 26)} />
            </clipPath>
            <radialGradient id="sim-scent">
              <stop offset="0" stopColor="#FF794B" stopOpacity=".7" />
              <stop offset="1" stopColor="#FF794B" stopOpacity="0" />
            </radialGradient>
          </defs>

          <circle cx={C} cy={C + 8} r="190" fill="#000" opacity={dark ? 0.25 : 0.08} />
          <circle cx={C} cy={C} r="190" fill="#20262C" />
          <circle cx={C} cy={C} r="182" fill="#F1EBDD" />

          {/* Tray — fully visible in x-ray, otherwise only through the window */}
          <SvgRotateValue value={trayDeg} cx={200} cy={200}>
            <g opacity={s.xray || s.phase === "setup" ? 1 : 0}>
              <TrayContents s={s} />
            </g>
          </SvgRotateValue>
          {!s.xray && s.phase !== "setup" && (
            <g clipPath="url(#sim-window)">
              <SvgRotateValue value={trayDeg} cx={200} cy={200}>
                <TrayContents s={s} />
              </SvgRotateValue>
            </g>
          )}

          {/* Lid (semi-transparent in setup / x-ray) */}
          <path
            d={`${sector(0.1, 182, 26, 334)} M200 200`}
            fill="#F1EBDD"
            opacity={s.xray || s.phase === "setup" ? 0.28 : 1}
            style={{ transition: "opacity .5s" }}
          />
          <path d={sector(166, 182, -26, 26)} fill="#F1EBDD" opacity={s.xray || s.phase === "setup" ? 0.28 : 1} />
          <path d={sector(0, 52, -26, 26)} fill="#F1EBDD" opacity={s.xray || s.phase === "setup" ? 0.28 : 1} />
          <circle cx={C} cy={C} r="176" fill="none" stroke="#0C3438" strokeOpacity=".08" strokeWidth="2" />

          {/* Scent ports (lid positions 1–5) */}
          {[1, 2, 3, 4, 5].map((port) => {
            const [x, y] = pt(122, port * 60);
            const sniffed = s.lastSniff?.port === port;
            return (
              <g key={port}>
                {sniffed && s.lastSniff!.strong && (
                  <motion.circle cx={x} cy={y} initial={{ r: 6, opacity: 0.9 }} animate={{ r: 34, opacity: 0 }} transition={{ duration: 1.2, repeat: 2 }} fill="url(#sim-scent)" />
                )}
                {[-10, 0, 10].map((o) => {
                  const [px, py] = pt(122, port * 60 + o);
                  return <circle key={o} cx={px} cy={py} r="4.5" fill="#0C3438" opacity={sniffed ? 0.9 : 0.35} />;
                })}
                <text x={x} y={y + 24} textAnchor="middle" fontSize="10" fontFamily="var(--font-geist-mono)" fill="#0C3438" opacity=".5">
                  P{port}
                </text>
              </g>
            );
          })}

          {/* Window frame */}
          <path d={sector(52, 166, -26, 26)} fill="none" stroke="#0C3438" strokeOpacity=".25" strokeWidth="2" />

          {/* Shutter (draggable) */}
          <SvgRotateValue
            value={shutterDeg}
            cx={200}
            cy={200}
            className={cn(s.phase === "play" ? "cursor-grab active:cursor-grabbing" : "cursor-not-allowed")}
            onPointerDown={(e) => {
              if (s.phase !== "play") return;
              dragging.current = true;
              (e.target as Element).setPointerCapture?.(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!dragging.current) return;
              dispatch({ type: "shutter", value: angleFromPointer(e.clientX, e.clientY) });
            }}
            onPointerUp={() => {
              dragging.current = false;
            }}
            onPointerCancel={() => {
              dragging.current = false;
            }}
          >
            <path d={sector(30, 172, -33, 33)} fill="#FF794B" />
            <path d={sector(150, 156, -24, 24)} fill="#0C3438" opacity=".18" />
          </SvgRotateValue>
          <circle cx={C} cy={C} r="34" fill="#FF794B" />
          <circle cx={C} cy={C} r="22" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="2" />

          {/* Window label */}
          <text x={C} y="6" textAnchor="middle" fontSize="10" letterSpacing="2" fontFamily="var(--font-geist-mono)" fill="currentColor" opacity=".7">
            WINDOW
          </text>
        </svg>

        {/* Progress chips */}
        <div className="mt-6 flex items-center justify-center gap-2" aria-hidden="true">
          {s.chambers.map((c, i) => (
            <span
              key={i}
              className={cn(
                "grid size-9 place-items-center rounded-full text-xs font-medium transition-colors",
                c.found ? "bg-mint text-forest" : c.loaded ? (dark ? "bg-white/10 text-ivory" : "bg-forest/10 text-forest") : dark ? "border border-white/15 text-ivory/40" : "border border-forest/15 text-forest/40",
                i === s.trayPos && s.phase !== "setup" && "ring-2 ring-coral ring-offset-2 ring-offset-transparent",
              )}
            >
              {c.found ? <Check size={14} /> : `0${i + 1}`}
            </span>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="lg:col-span-6">
        <div className={cn("rounded-[var(--radius-panel)] p-6 sm:p-8", dark ? "bg-white/[0.05] ring-1 ring-white/10" : "bg-white ring-1 ring-forest/10")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-eyebrow text-coral">
              {s.phase === "setup" ? "Step 1 · Set up" : s.phase === "play" ? "Step 2 · Play" : "Complete"}
            </p>
            <p className={cn("tabular text-sm", dark ? "text-ivory/60" : "text-graphite/60")}>
              {found}/{loaded} treats · {s.cycles} click{s.cycles === 1 ? "" : "s"} · {s.sniffs} sniff{s.sniffs === 1 ? "" : "s"}
            </p>
          </div>

          <p className="mt-4 min-h-[3.5rem] text-lg leading-snug" role="status" aria-live="polite">
            {s.message}
          </p>

          <AnimatePresence mode="wait" initial={false}>
            {s.phase === "setup" && (
              <motion.div key="setup" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6 space-y-6">
                <fieldset>
                  <legend className={cn("text-sm font-medium", dark ? "text-ivory/80" : "text-graphite/80")}>Load chambers with a treat</legend>
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {DISCOVERIES.map((d) => {
                      const on = s.chambers[d.index]!.loaded;
                      return (
                        <button
                          key={d.key}
                          type="button"
                          aria-pressed={on}
                          onClick={() => dispatch({ type: "toggleLoad", chamber: d.index })}
                          className={cn(
                            "flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-xs font-medium transition-colors",
                            on ? "bg-mint text-forest" : dark ? "bg-white/[0.06] text-ivory/70 hover:bg-white/10" : "bg-forest/[0.05] text-forest/70 hover:bg-forest/10",
                          )}
                          aria-label={`Chamber ${d.index + 1}, ${d.name}: ${on ? "loaded" : "empty"}`}
                        >
                          <svg viewBox="-14 -14 28 28" className="size-6" aria-hidden="true">
                            <InsertGlyph index={d.index} />
                          </svg>
                          0{d.index + 1}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className={cn("text-sm font-medium", dark ? "text-ivory/80" : "text-graphite/80")}>Start under the window</legend>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {DISCOVERIES.map((d) => (
                      <button
                        key={d.key}
                        type="button"
                        aria-pressed={s.startPos === d.index}
                        onClick={() => dispatch({ type: "setStart", chamber: d.index })}
                        className={cn(
                          "h-10 rounded-full px-3.5 text-sm transition-colors",
                          s.startPos === d.index ? "bg-coral font-medium text-forest" : dark ? "bg-white/[0.06] hover:bg-white/10" : "bg-forest/[0.05] hover:bg-forest/10",
                        )}
                      >
                        {d.name}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => dispatch({ type: "start", now: Date.now() })} icon={<Play size={16} />} disabled={loaded === 0}>
                    Start puzzle
                  </Button>
                  <Button variant="outline" onClick={() => dispatch({ type: "loadAll" })}>
                    Load all
                  </Button>
                </div>
              </motion.div>
            )}

            {s.phase === "play" && (
              <motion.div key="play" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6 space-y-6">
                <div>
                  <label htmlFor="sim-shutter" className={cn("flex justify-between text-sm font-medium", dark ? "text-ivory/80" : "text-graphite/80")}>
                    <span>Push the shutter</span>
                    <span className="tabular">{Math.round(s.shutter * 100)}%</span>
                  </label>
                  <input
                    id="sim-shutter"
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round(s.shutter * 100)}
                    onChange={(e) => dispatch({ type: "shutter", value: Number(e.target.value) / 100 })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") dispatch({ type: "release" });
                    }}
                    aria-describedby="sim-shutter-hint"
                    className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-current/15 accent-coral"
                  />
                  <p id="sim-shutter-hint" className={cn("mt-2 text-xs", dark ? "text-ivory/50" : "text-graphite/55")}>
                    Drag the coral shutter (or this slider) past {Math.round(OPEN_THRESHOLD * 100)}% to open the window — you&apos;re holding it
                    open like a paw would. Press <strong>Release</strong> (or Enter) to let the spring snap it shut; a full stroke indexes the tray.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {open && current.loaded && !current.found && needsPreparation(s.trayPos) && !current.prepared && (
                    <Button variant="mint" onClick={() => dispatch({ type: "prepare" })}>
                      {preparationVerb(s.trayPos)}
                    </Button>
                  )}
                  <Button onClick={() => dispatch({ type: "retrieve", now: Date.now() })} disabled={!canRetrieve(s)}>
                    Retrieve treat
                  </Button>
                  <Button variant="outline" onClick={() => dispatch({ type: "release" })} disabled={s.shutter === 0}>
                    Release shutter
                  </Button>
                </div>

                <div>
                  <p className={cn("text-sm font-medium", dark ? "text-ivory/80" : "text-graphite/80")}>Sniff a scent port</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => dispatch({ type: "sniff", port: p })}
                        className={cn(
                          "h-10 rounded-full px-4 text-sm font-medium transition-colors",
                          s.lastSniff?.port === p
                            ? s.lastSniff.strong
                              ? "bg-coral text-forest"
                              : "bg-white/20"
                            : dark
                              ? "bg-white/[0.06] hover:bg-white/10"
                              : "bg-forest/[0.05] hover:bg-forest/10",
                        )}
                        aria-label={`Sniff port ${p} (above chamber 0${chamberAtPort(s, p) + 1} — hidden)`}
                      >
                        P{p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-current/10 pt-5">
                  <Button variant="ghost" size="sm" onClick={() => dispatch({ type: "toggleXray" })} icon={<Eye size={16} />} aria-pressed={s.xray}>
                    {s.xray ? "Hide" : "Peek inside"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => dispatch({ type: "restart" })} icon={<Rotate size={16} />}>
                    New puzzle
                  </Button>
                </div>
              </motion.div>
            )}

            {s.phase === "complete" && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="mt-6">
                <dl className="grid grid-cols-3 gap-3 text-center">
                  {[
                    ["Treats", `${found}/${loaded}`],
                    ["Clicks", String(s.cycles)],
                    ["Time", elapsed !== null ? `${elapsed}s` : "—"],
                  ].map(([k, v]) => (
                    <div key={k} className={cn("rounded-2xl p-4", dark ? "bg-white/[0.06]" : "bg-forest/[0.05]")}>
                      <dt className="text-eyebrow opacity-60">{k}</dt>
                      <dd className="tabular mt-2 font-display text-3xl font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button onClick={() => dispatch({ type: "replay" })} icon={<Play size={16} />}>
                    Replay this setup
                  </Button>
                  <Button variant="outline" onClick={() => dispatch({ type: "restart" })} icon={<Rotate size={16} />}>
                    Restart from scratch
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <p className={cn("mt-4 text-xs leading-relaxed", dark ? "text-ivory/50" : "text-graphite/55")}>
          Interactive concept demonstration. It models the proposed mechanism; the physical ratchet has not yet been prototyped or validated.
        </p>
      </div>
    </div>
  );
}

function TrayContents({ s }: { s: ReturnType<typeof initialSimState> }) {
  return (
    <g>
      <circle cx={C} cy={C} r="170" fill="#E5F8F5" />
      {DISCOVERIES.map((d) => {
        const deg = d.index * 60;
        const c = s.chambers[d.index]!;
        const [gx, gy] = pt(104, deg);
        const [tx, ty] = pt(136, deg);
        return (
          <g key={d.key}>
            <path d={sector(52, 166, deg - 28, deg + 28)} fill={c.found ? "#d6efe9" : "#cfeee6"} stroke="#0C3438" strokeOpacity=".1" />
            <g transform={`translate(${gx} ${gy}) rotate(${deg})`} color="#134a4f">
              <InsertGlyph index={d.index} />
            </g>
            {c.loaded && !c.found && (
              <g transform={`translate(${tx} ${ty})`}>
                <ellipse rx="7" ry="5" fill="#A0612F" />
                <ellipse cx="9" cy="5" rx="5" ry="4" fill="#8a5227" />
              </g>
            )}
            {(() => {
              const [nx, ny] = pt(64, deg);
              return (
                <text x={nx} y={ny + 3} textAnchor="middle" fontSize="9" fontFamily="var(--font-geist-mono)" fill="#0C3438" opacity=".55">
                  0{d.index + 1}
                </text>
              );
            })()}
          </g>
        );
      })}
    </g>
  );
}
