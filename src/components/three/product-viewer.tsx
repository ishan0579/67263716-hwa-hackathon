"use client";

import { Html, OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { DIFFICULTY_LABEL, DISCOVERIES } from "@/content/discoveries";
import { cn } from "@/lib/utils";
import { Close, Expand, Eye, Layers, Play, Rotate, ChevronLeft, ChevronRight } from "../ui/icons";
import { defaultTargets, LAYERS, SniffOrbitModel, type ModelTargets } from "./sniff-orbit-model";
import { GroundShadow, Stage, StudioLights, useQuality } from "./stage";
import { ProductFallback } from "./product-fallback";

const HOME = new THREE.Vector3(0, 2.6, 6.6);
const HOME_TARGET = new THREE.Vector3(0, 0.3, 0);
const LAYER_BASE_Y = [0.05, 0.36, 0.22, 0.36, 0.58, 0.68];

type CamCmd = { kind: "reset" } | { kind: "rotate"; delta: number } | { kind: "frame-explode" } | null;

/** Smoothly animates the camera for reset/rotate commands; yields to user drags. */
function CameraRig({ command, controls }: { command: { cmd: CamCmd; n: number }; controls: React.RefObject<OrbitControlsImpl | null> }) {
  const { camera } = useThree();
  const goal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  useEffect(() => {
    const c = controls.current;
    if (!command.cmd || !c) return;
    if (command.cmd.kind === "reset") {
      goal.current = { pos: HOME.clone(), target: HOME_TARGET.clone() };
    } else if (command.cmd.kind === "frame-explode") {
      goal.current = { pos: new THREE.Vector3(4.4, 3.4, 8.2), target: new THREE.Vector3(0, 0.55, 0) };
    } else {
      const offset = camera.position.clone().sub(c.target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), command.cmd.delta);
      goal.current = { pos: c.target.clone().add(offset), target: c.target.clone() };
    }
  }, [command, camera, controls]);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const stop = () => (goal.current = null);
    c.addEventListener("start", stop);
    return () => c.removeEventListener("start", stop);
  }, [controls]);

  useFrame((_, dt) => {
    const g = goal.current;
    const c = controls.current;
    if (!g || !c) return;
    const k = 1 - Math.exp(-5 * Math.min(dt, 0.1));
    camera.position.lerp(g.pos, k);
    c.target.lerp(g.target, k);
    c.update();
    if (camera.position.distanceTo(g.pos) < 0.01) goal.current = null;
  });
  return null;
}

export type ViewerProps = {
  colorKey: string;
  colorHex: string;
  accentHex: string;
  size?: "standard" | "large";
  className?: string;
  /** Shown on the expand button + inspect overlay. */
  title?: string;
};

export default function ProductViewer({ colorKey, colorHex, accentHex, size = "standard", className, title = "SniffOrbit ONE" }: ViewerProps) {
  const targets = useRef<ModelTargets>(defaultTargets());
  const controls = useRef<OrbitControlsImpl | null>(null);
  const quality = useQuality();
  const [exploded, setExploded] = useState(false);
  const [xray, setXray] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [demoRunning, setDemoRunning] = useState(false);
  const [eaten, setEaten] = useState<boolean[]>(Array(6).fill(false));
  const [step, setStep] = useState(0);
  const [cam, setCam] = useState<{ cmd: CamCmd; n: number }>({ cmd: null, n: 0 });
  const [expanded, setExpanded] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const [announce, setAnnounce] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    const t = targets.current;
    t.explode = exploded ? 1 : 0;
    t.xray = xray ? 1 : 0;
    t.scale = size === "large" ? 34 / 28 : 1;
  }, [exploded, xray, size]);

  const sendCam = (cmd: CamCmd) => setCam((c) => ({ cmd, n: c.n + 1 }));

  const toggleExplode = () => {
    setExploded((e) => {
      const next = !e;
      sendCam(next ? { kind: "frame-explode" } : { kind: "reset" });
      setAnnounce(next ? "Exploded view: components separated." : "Assembled view.");
      return next;
    });
  };

  const selectChamber = useCallback((i: number) => {
    setSelected((cur) => (cur === i ? null : i));
    setXray(true);
    const d = DISCOVERIES[i]!;
    setAnnounce(`Chamber ${i + 1}: ${d.name}. ${d.description}`);
  }, []);

  const runMechanism = () => {
    if (demoRunning) return;
    setDemoRunning(true);
    setExploded(false);
    const t = targets.current;
    const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
    const current = step % 6;
    setAnnounce(`Shutter opens over chamber ${current + 1}.`);
    at(0, () => (t.shutter = 1));
    at(1300, () => {
      setEaten((e) => e.map((v, i) => (i === current ? true : v)));
    });
    at(1700, () => (t.shutter = 0));
    at(2300, () => {
      const next = step + 1;
      t.trayStep = next;
      setStep(next);
      setAnnounce(`Shutter closed. The ratchet indexed the tray to chamber ${(next % 6) + 1}.`);
    });
    at(3000, () => setDemoRunning(false));
  };

  const refill = () => {
    setEaten(Array(6).fill(false));
    setAnnounce("All six chambers refilled.");
  };

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setExpanded(false);
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [expanded]);

  const allEaten = eaten.every(Boolean);
  const d = selected !== null ? DISCOVERIES[selected]! : null;

  const controlBtn = (active: boolean) =>
    cn(
      "inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-medium transition-colors",
      active ? "bg-forest text-ivory" : "bg-white/80 text-forest hover:bg-white",
    );

  return (
    <div
      className={cn(
        expanded ? "fixed inset-0 z-[60] bg-ivory" : "relative",
        "flex flex-col",
        className,
      )}
      role={expanded ? "dialog" : undefined}
      aria-modal={expanded || undefined}
      aria-label={expanded ? `${title} — 3D inspection` : undefined}
    >
      <div className="relative min-h-0 flex-1" data-cursor="Drag" onPointerDown={() => setInteracted(true)}>
        <Stage
          className="absolute inset-0"
          quality={quality}
          label={`Interactive 3D model of ${title}. Drag to rotate, scroll or pinch to zoom. Use the buttons below for exploded and inside views.`}
          camera={{ position: HOME.toArray() as [number, number, number], fov: 28 }}
          fallback={<ProductFallback colorKey={colorKey} colorHex={colorHex} accentHex={accentHex} alt="" />}
        >
          <StudioLights />
          <group rotation={[0, -0.5, 0]}>
            <SniffOrbitModel
              colorHex={colorHex}
              accentHex={accentHex}
              targets={targets}
              quality={quality}
              eaten={eaten}
              selectedChamber={selected}
              onSelectChamber={selectChamber}
              interactive
            />
            {exploded &&
              LAYERS.map((l, i) => (
                <Html
                  key={l.key}
                  position={[1.75, LAYER_BASE_Y[i]! + l.offset - 1.05, 0]}
                  center
                  style={{ pointerEvents: "none" }}
                  zIndexRange={[20, 0]}
                >
                  <span className="block whitespace-nowrap rounded-full bg-forest/90 px-2.5 py-1 text-[11px] font-medium text-ivory shadow-lg">
                    {l.label}
                  </span>
                </Html>
              ))}
          </group>
          <GroundShadow quality={quality} />
          <OrbitControls
            ref={controls}
            makeDefault
            enablePan={false}
            enableDamping
            dampingFactor={0.08}
            minDistance={3.4}
            maxDistance={11}
            minPolarAngle={0.12}
            maxPolarAngle={Math.PI * 0.6}
            target={HOME_TARGET.toArray() as [number, number, number]}
            autoRotate={!interacted && !exploded && selected === null}
            autoRotateSpeed={0.6}
          />
          <CameraRig command={cam} controls={controls} />
        </Stage>

        {!interacted && (
          <p className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-forest/85 px-3 py-1.5 text-xs font-medium text-ivory">
            Drag to rotate · pinch or scroll to zoom
          </p>
        )}

        <div className="absolute right-3 top-3 flex gap-2">
          <button type="button" onClick={() => setExpanded((e) => !e)} className={controlBtn(false)} aria-label={expanded ? "Back to shopping view" : "Open full-screen 3D inspection"}>
            {expanded ? <Close size={18} /> : <Expand size={18} />}
            <span className="hidden sm:inline">{expanded ? "Back to shopping view" : "Inspect"}</span>
          </button>
        </div>

        <AnimatePresence>
          {d && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute bottom-3 left-3 right-3 max-w-sm rounded-2xl bg-forest p-4 text-ivory shadow-xl sm:right-auto"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-eyebrow text-mint">
                    Chamber {String((selected ?? 0) + 1).padStart(2, "0")} · {DIFFICULTY_LABEL[d.difficulty]}
                  </p>
                  <p className="mt-1.5 font-display text-xl font-semibold tracking-[-0.02em]">{d.name}</p>
                </div>
                <button type="button" onClick={() => setSelected(null)} className="grid size-8 place-items-center rounded-full hover:bg-white/10" aria-label="Close chamber details">
                  <Close size={16} />
                </button>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ivory/75">{d.description}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls — all 3D interactions are also reachable by keyboard here. */}
      <div className={cn("relative z-10 flex flex-col gap-3 pt-3", expanded && "container-x pb-5")}>
        <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="3D view controls">
          <button type="button" onClick={toggleExplode} aria-pressed={exploded} className={controlBtn(exploded)}>
            <Layers size={18} /> Exploded
          </button>
          <button
            type="button"
            onClick={() => {
              setXray((x) => !x);
              setAnnounce(xray ? "Shell opaque." : "Inside view: shell made transparent.");
            }}
            aria-pressed={xray}
            className={controlBtn(xray)}
          >
            <Eye size={18} /> Inside
          </button>
          <button type="button" onClick={runMechanism} disabled={demoRunning} className={cn(controlBtn(demoRunning), "disabled:opacity-80")}>
            <Play size={16} /> {demoRunning ? "Cycling…" : "Run mechanism"}
          </button>
          {allEaten && (
            <button type="button" onClick={refill} className={controlBtn(false)}>
              Refill
            </button>
          )}
          <span className="mx-1 hidden h-6 w-px bg-graphite/15 sm:block" aria-hidden="true" />
          <button type="button" onClick={() => sendCam({ kind: "rotate", delta: Math.PI / 4 })} className={controlBtn(false)} aria-label="Rotate view left">
            <ChevronLeft size={18} />
          </button>
          <button type="button" onClick={() => sendCam({ kind: "rotate", delta: -Math.PI / 4 })} className={controlBtn(false)} aria-label="Rotate view right">
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            onClick={() => {
              sendCam({ kind: "reset" });
              setExploded(false);
              setXray(false);
              setSelected(null);
            }}
            className={controlBtn(false)}
          >
            <Rotate size={17} /> Reset
          </button>
        </div>
        <fieldset className="flex flex-wrap items-center gap-2">
          <legend className="sr-only">Select a chamber to inspect</legend>
          <span className="text-eyebrow mr-1 text-graphite/60" aria-hidden="true">
            Chambers
          </span>
          {DISCOVERIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => selectChamber(c.index)}
              aria-pressed={selected === c.index}
              aria-label={`Chamber ${c.index + 1}: ${c.name}${eaten[c.index] ? " (discovered)" : ""}`}
              className={cn(
                "tabular relative grid size-10 place-items-center rounded-full border text-sm font-medium transition-colors",
                selected === c.index ? "border-coral bg-coral text-forest" : "border-graphite/15 bg-white/70 hover:border-graphite/40",
              )}
            >
              {c.index + 1}
              {eaten[c.index] && <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-forest ring-2 ring-ivory" aria-hidden="true" />}
            </button>
          ))}
        </fieldset>
        <p className="sr-only" aria-live="polite">
          {announce}
        </p>
      </div>
    </div>
  );
}
