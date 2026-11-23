"use client";
/* eslint-disable react-hooks/immutability -- The R3F render loop is intentionally imperative: useFrame mutates three.js objects and animation-target refs every frame without re-rendering React. */

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type * as THREE from "three";
import { defaultTargets, SniffOrbitModel, type ModelTargets } from "./sniff-orbit-model";
import { GroundShadow, Stage, StudioLights, usePrefersReducedMotion, useQuality } from "./stage";
import { ProductFallback } from "./product-fallback";

/** Idle choreography: slow turn, gentle float, pointer parallax and a periodic "peek" cycle. */
function HeroRig({
  reduced,
  targets,
  quality,
}: {
  reduced: boolean;
  targets: React.RefObject<ModelTargets>;
  quality: "high" | "low";
}) {
  const group = useRef<THREE.Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const clock = useRef(0);
  const entered = useRef(0);

  useEffect(() => {
    const on = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", on, { passive: true });
    return () => window.removeEventListener("pointermove", on);
  }, []);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const d = Math.min(dt, 0.1);
    clock.current += d;
    entered.current = Math.min(1, entered.current + d * 0.7);
    const e = 1 - Math.pow(1 - entered.current, 3);
    const t = clock.current;

    if (!reduced) {
      g.rotation.y = -0.5 + t * 0.14 + (1 - e) * -1.2;
      g.position.y = Math.sin(t * 0.9) * 0.05 + (1 - e) * -0.6;
      g.rotation.x += (pointer.current.y * 0.12 + 0.05 - g.rotation.x) * (1 - Math.exp(-3 * d));
      g.rotation.z += (-pointer.current.x * 0.08 - g.rotation.z) * (1 - Math.exp(-3 * d));
      // Peek: every 7 s the shutter opens, then springs shut and the tray indexes.
      const cycle = t % 7;
      const tg = targets.current!;
      tg.shutter = cycle > 3.2 && cycle < 4.6 ? 1 : 0;
      tg.trayStep = Math.floor((t + 2.2) / 7);
    } else {
      g.rotation.set(0.06, -0.55, 0);
      g.position.y = 0;
    }
  });

  return (
    <group ref={group} position={[0, 0, 0]}>
      <SniffOrbitModel colorHex="#F1EBDD" accentHex="#FF794B" targets={targets} quality={quality} />
    </group>
  );
}

export default function HeroScene({ className }: { className?: string }) {
  const targets = useRef<ModelTargets>(defaultTargets());
  const reduced = usePrefersReducedMotion();
  const quality = useQuality();

  return (
    <Stage
      className={className}
      quality={quality}
      label="SniffOrbit ONE in Morning Walk: an ivory puck-shaped puzzle with a coral sliding shutter, slowly rotating."
      camera={{ position: [0, 3.1, 6.6], fov: 26 }}
      fallback={
        <ProductFallback colorKey="morning-walk" colorHex="#F1EBDD" accentHex="#FF794B" priority alt="" sizes="(max-width: 768px) 100vw, 60vw" />
      }
      onCreated={({ camera }) => camera.lookAt(0, 0.25, 0)}
    >
      <StudioLights tone="dark" />
      <HeroRig reduced={reduced} targets={targets} quality={quality} />
      <GroundShadow quality={quality} opacity={0.55} />
    </Stage>
  );
}
