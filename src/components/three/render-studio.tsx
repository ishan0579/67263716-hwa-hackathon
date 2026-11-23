"use client";

import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { defaultTargets, SniffOrbitModel, type ModelTargets } from "./sniff-orbit-model";
import { GroundShadow, StudioLights } from "./stage";

/**
 * Development-only render studio used by `npm run render:products` to produce
 * static product imagery (transparent PNGs) from the real 3D model.
 */
export default function RenderStudio({
  colorHex,
  accentHex,
  view,
}: {
  colorHex: string;
  accentHex: string;
  view: "hero" | "top" | "exploded" | "xray";
}) {
  const targets = useRef<ModelTargets>({
    ...defaultTargets(),
    explode: view === "exploded" ? 1 : 0,
    xray: view === "xray" ? 1 : 0,
    shutter: view === "top" ? 0.55 : 0,
  });
  const cam: [number, number, number] =
    view === "top" ? [0, 8.4, 2.6] : view === "exploded" ? [5.6, 4.1, 9.6] : [0, 3.4, 8.6];

  return (
    <div className="h-screen w-screen" data-render-ready="false" id="render-root">
      <Canvas
        dpr={2}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        camera={{ position: cam, fov: 26 }}
        onCreated={({ gl, camera }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          camera.lookAt(0, view === "exploded" ? 0.6 : 0.25, 0);
          setTimeout(() => document.getElementById("render-root")?.setAttribute("data-render-ready", "true"), 2500);
        }}
      >
        <StudioLights />
        <group rotation={[0, view === "top" ? 0 : -0.55, 0]}>
          <SniffOrbitModel colorHex={colorHex} accentHex={accentHex} targets={targets} quality="high" />
        </group>
        <GroundShadow quality="high" opacity={0.38} />
      </Canvas>
    </div>
  );
}
