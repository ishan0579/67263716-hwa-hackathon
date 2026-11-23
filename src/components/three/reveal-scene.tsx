"use client";
/* eslint-disable react-hooks/immutability -- The R3F render loop is intentionally imperative: useFrame mutates three.js objects and animation-target refs every frame without re-rendering React. */

import { useFrame, useThree } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
import { useRef } from "react";
import * as THREE from "three";
import { defaultTargets, SniffOrbitModel, type ModelTargets } from "./sniff-orbit-model";
import { GroundShadow, Stage, StudioLights, useQuality } from "./stage";
import { ProductFallback } from "./product-fallback";

type V3 = [number, number, number];
type Key = {
  p: number;
  cam: V3;
  look: V3;
  rotY: number;
  rotX: number;
  posY: number;
  scale: number;
  explode: number;
  shutter: number;
  tray: number;
  focus: number[];
};

/**
 * Scroll choreography for the product reveal. Each key is a pose at a given
 * scroll progress; values between keys are eased with smoothstep.
 */
const KEYS: Key[] = [
  { p: 0.0, cam: [0, 1.1, 8.8], look: [0, 0.3, 0], rotY: -2.6, rotX: 0.75, posY: -1.7, scale: 0.72, explode: 0, shutter: 0, tray: 0, focus: [] },
  { p: 0.12, cam: [0, 2.4, 6.9], look: [0, 0.3, 0], rotY: -0.55, rotX: 0, posY: 0, scale: 1, explode: 0, shutter: 0, tray: 0, focus: [] },
  { p: 0.22, cam: [0, 6.3, 2.7], look: [0, 0.35, 0], rotY: -0.08, rotX: 0, posY: 0, scale: 1, explode: 0, shutter: 0, tray: 0, focus: [] },
  { p: 0.28, cam: [0, 6.0, 2.6], look: [0, 0.35, 0], rotY: 0, rotX: 0, posY: 0, scale: 1, explode: 0, shutter: 1, tray: 0, focus: [] },
  { p: 0.34, cam: [0, 6.0, 2.6], look: [0, 0.35, 0], rotY: 0, rotX: 0, posY: 0, scale: 1, explode: 0, shutter: 0, tray: 0, focus: [] },
  { p: 0.4, cam: [0, 5.4, 3.8], look: [0, 0.35, 0], rotY: 0.05, rotX: 0, posY: 0, scale: 1, explode: 0, shutter: 0, tray: 1, focus: [] },
  { p: 0.48, cam: [4.9, 3.5, 8.6], look: [0, 0.55, 0], rotY: 0.3, rotX: 0, posY: 0, scale: 1, explode: 1, shutter: 0, tray: 1, focus: [] },
  { p: 0.52, cam: [4.9, 3.5, 8.6], look: [0, 0.55, 0], rotY: 0.36, rotX: 0, posY: 0, scale: 1, explode: 1, shutter: 0, tray: 1, focus: [4, 5] },
  { p: 0.62, cam: [4.6, 3.2, 8.2], look: [0, 0.5, 0], rotY: 0.48, rotX: 0, posY: 0, scale: 1, explode: 1, shutter: 0, tray: 1, focus: [3] },
  { p: 0.72, cam: [4.4, 2.6, 8.2], look: [0, 0.4, 0], rotY: 0.6, rotX: 0, posY: 0, scale: 1, explode: 1, shutter: 0, tray: 1, focus: [2] },
  { p: 0.8, cam: [4.4, 2.2, 8.2], look: [0, 0.3, 0], rotY: 0.72, rotX: 0, posY: 0, scale: 1, explode: 1, shutter: 0, tray: 1, focus: [0, 1] },
  { p: 0.86, cam: [4.4, 3.2, 8.4], look: [0, 0.5, 0], rotY: 0.8, rotX: 0, posY: 0, scale: 1, explode: 1, shutter: 0, tray: 1, focus: [] },
  { p: 0.95, cam: [0, 2.6, 6.7], look: [0, 0.3, 0], rotY: 1.5, rotX: 0, posY: 0, scale: 1, explode: 0, shutter: 0, tray: 1, focus: [] },
  { p: 1.0, cam: [0, 2.5, 6.5], look: [0, 0.3, 0], rotY: 1.75, rotX: 0, posY: 0, scale: 1, explode: 0, shutter: 0.45, tray: 1, focus: [] },
];

const smooth = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function sample(p: number) {
  const x = THREE.MathUtils.clamp(p, 0, 1);
  let i = 0;
  while (i < KEYS.length - 2 && x > KEYS[i + 1]!.p) i++;
  const a = KEYS[i]!;
  const b = KEYS[i + 1]!;
  const t = smooth(THREE.MathUtils.clamp((x - a.p) / (b.p - a.p), 0, 1));
  return { a, b, t };
}

function RevealRig({ progress, targets, quality }: { progress: MotionValue<number>; targets: React.RefObject<ModelTargets>; quality: "high" | "low" }) {
  const group = useRef<THREE.Group>(null);
  const { camera, size } = useThree();
  const look = useRef(new THREE.Vector3());
  const camGoal = useRef(new THREE.Vector3());
  const lookGoal = useRef(new THREE.Vector3());

  useFrame((_, dt) => {
    const { a, b, t } = sample(progress.get());
    const aspect = size.width / Math.max(size.height, 1);
    const fit = aspect < 1 ? Math.min(2.1, 1.05 / aspect) : aspect < 1.3 ? 1.15 : 1;

    lookGoal.current.set(mix(a.look[0], b.look[0], t), mix(a.look[1], b.look[1], t), mix(a.look[2], b.look[2], t));
    camGoal.current
      .set(mix(a.cam[0], b.cam[0], t), mix(a.cam[1], b.cam[1], t), mix(a.cam[2], b.cam[2], t))
      .sub(lookGoal.current)
      .multiplyScalar(fit)
      .add(lookGoal.current);

    const k = 1 - Math.exp(-7 * Math.min(dt, 0.1));
    camera.position.lerp(camGoal.current, k);
    look.current.lerp(lookGoal.current, k);
    camera.lookAt(look.current);

    const g = group.current;
    if (g) {
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, mix(a.rotY, b.rotY, t), k);
      g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, mix(a.rotX, b.rotX, t), k);
      g.position.y = THREE.MathUtils.lerp(g.position.y, mix(a.posY, b.posY, t), k);
    }
    const tg = targets.current!;
    tg.scale = mix(a.scale, b.scale, t);
    tg.explode = mix(a.explode, b.explode, t);
    tg.shutter = mix(a.shutter, b.shutter, t);
    tg.trayStep = mix(a.tray, b.tray, t);
    tg.focus = t < 0.5 ? a.focus : b.focus;
  });

  return (
    <group ref={group}>
      <SniffOrbitModel colorHex="#F1EBDD" accentHex="#FF794B" targets={targets} quality={quality} />
    </group>
  );
}

export default function RevealScene({ progress, className }: { progress: MotionValue<number>; className?: string }) {
  const targets = useRef<ModelTargets>(defaultTargets());
  const quality = useQuality();

  return (
    <Stage
      className={className}
      quality={quality}
      label="Scroll-driven 3D reveal of SniffOrbit ONE: the product turns, opens its shutter, indexes the tray, then separates into its six components."
      camera={{ position: [0, 1.1, 8.8], fov: 27 }}
      fallback={<ProductFallback colorKey="morning-walk" colorHex="#F1EBDD" accentHex="#FF794B" alt="" />}
    >
      <StudioLights tone="dark" />
      <RevealRig progress={progress} targets={targets} quality={quality} />
      <GroundShadow quality={quality} opacity={0.5} />
    </Stage>
  );
}
