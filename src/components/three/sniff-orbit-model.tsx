"use client";
/* eslint-disable react-hooks/immutability, react-hooks/refs -- The R3F render loop is intentionally imperative: useFrame mutates three.js objects and animation-target refs every frame without re-rendering React. */

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { buildGeometries, DIM, disposeAll, insertFloorY, polar, type Quality } from "./geometry";
import { LAYERS } from "./layers";

/**
 * Animation targets. Scenes mutate these refs (scroll, timers, UI); the model
 * eases its internal state towards them every frame, so React never re-renders
 * during animation.
 */
export type ModelTargets = {
  explode: number; // 0 assembled → 1 fully exploded
  shutter: number; // 0 closed → 1 open
  trayStep: number; // chambers advanced (may be fractional for scroll scrubbing)
  xray: number; // 0 opaque shell → 1 see-through shell
  focus: number[]; // layer indices to emphasise (empty = all); 0 base … 5 shutter
  scale: number;
};

export const defaultTargets = (): ModelTargets => ({ explode: 0, shutter: 0, trayStep: 0, xray: 0, focus: [], scale: 1 });

export { LAYERS };

type Props = {
  colorHex: string;
  accentHex: string;
  targets: RefObject<ModelTargets>;
  quality?: Quality;
  eaten?: boolean[];
  selectedChamber?: number | null;
  onSelectChamber?: (i: number) => void;
  interactive?: boolean;
};

const damp = THREE.MathUtils.damp;
const TRAY_COLOR = "#e6f6f2";
const INSERT_COLOR = "#a9dccf";

function physical(params: THREE.MeshPhysicalMaterialParameters) {
  return new THREE.MeshPhysicalMaterial({ ...params });
}

export function SniffOrbitModel({
  colorHex,
  accentHex,
  targets,
  quality = "high",
  eaten,
  selectedChamber = null,
  onSelectChamber,
  interactive = false,
}: Props) {
  const geo = useMemo(() => buildGeometries(quality), [quality]);

  const mats = useMemo(() => {
    const hi = quality === "high";
    const shell = () =>
      physical({
        color: colorHex,
        roughness: 0.58,
        clearcoat: hi ? 0.35 : 0,
        clearcoatRoughness: 0.55,
        sheen: hi ? 0.22 : 0,
        sheenRoughness: 0.7,
        sheenColor: new THREE.Color("#ffffff"),
        side: THREE.DoubleSide,
      });
    return {
      housing: shell(),
      lid: shell(),
      shutter: physical({ color: accentHex, roughness: 0.42, clearcoat: hi ? 0.6 : 0, clearcoatRoughness: 0.35 }),
      hub: physical({ color: accentHex, roughness: 0.32, clearcoat: hi ? 0.8 : 0, clearcoatRoughness: 0.2 }),
      base: new THREE.MeshStandardMaterial({ color: "#1d2329", roughness: 0.94, side: THREE.DoubleSide }),
      tray: physical({ color: TRAY_COLOR, roughness: 0.34, clearcoat: hi ? 0.4 : 0, side: THREE.DoubleSide }),
      insert: physical({ color: INSERT_COLOR, roughness: 0.45, side: THREE.DoubleSide }),
      mech: new THREE.MeshStandardMaterial({ color: "#3a424a", metalness: 0.45, roughness: 0.42 }),
      steel: new THREE.MeshStandardMaterial({ color: "#c9d0d6", metalness: 0.95, roughness: 0.28 }),
      kibble: new THREE.MeshStandardMaterial({ color: "#a0612f", roughness: 0.82 }),
      highlight: new THREE.MeshBasicMaterial({ color: "#FF794B", transparent: true, opacity: 0, depthWrite: false }),
      hit: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
    };
    // Colour changes are animated in useFrame; materials are created once per quality level.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quality]);

  useEffect(
    () => () => {
      disposeAll(geo);
      disposeAll(mats);
    },
    [geo, mats],
  );

  const colorTarget = useMemo(() => new THREE.Color(colorHex), [colorHex]);
  const accentTarget = useMemo(() => new THREE.Color(accentHex), [accentHex]);

  const root = useRef<THREE.Group>(null);
  const layerRefs = useRef<(THREE.Group | null)[]>([]);
  const trayRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Group>(null);
  const shutterRef = useRef<THREE.Group>(null);
  const cur = useRef({ explode: 0, shutter: 0, tray: 0, xray: 0, scale: 1, dims: [1, 1, 1, 1, 1, 1], hl: 0 });

  const layerMats: THREE.Material[][] = useMemo(
    () => [[mats.base], [mats.housing], [mats.mech, mats.steel], [mats.tray, mats.insert, mats.kibble], [mats.lid], [mats.shutter, mats.hub]],
    [mats],
  );

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const t = targets.current;
    if (!t) return;
    const c = cur.current;
    c.explode = damp(c.explode, t.explode, 4.2, dt);
    c.shutter = damp(c.shutter, t.shutter, 6, dt);
    c.tray = damp(c.tray, t.trayStep, 5, dt);
    c.xray = damp(c.xray, t.xray, 5, dt);
    c.scale = damp(c.scale, t.scale, 5, dt);

    mats.housing.color.lerp(colorTarget, 1 - Math.exp(-6 * dt));
    mats.lid.color.copy(mats.housing.color);
    mats.shutter.color.lerp(accentTarget, 1 - Math.exp(-6 * dt));
    mats.hub.color.copy(mats.shutter.color);

    if (root.current) {
      root.current.scale.setScalar(c.scale);
      root.current.position.y = -c.explode * 1.05 * c.scale;
    }
    LAYERS.forEach((l, i) => {
      const g = layerRefs.current[i];
      if (g) g.position.y = l.offset * c.explode;
    });
    const trayAngle = (-c.tray * Math.PI) / 3;
    if (trayRef.current) trayRef.current.rotation.y = trayAngle;
    if (ringRef.current) ringRef.current.rotation.y = trayAngle;
    if (shutterRef.current) shutterRef.current.rotation.y = c.shutter * DIM.SHUTTER_OPEN;

    // Per-layer opacity: x-ray fades the shell; focus dims everything but one layer.
    for (let i = 0; i < 6; i++) {
      const shellLayer = i === 1 || i === 4 || i === 5;
      const xrayAlpha = shellLayer ? 1 - c.xray * (i === 5 ? 0.6 : 0.82) : 1;
      const focusAlpha = t.focus.length === 0 || t.focus.includes(i) ? 1 : 0.14;
      c.dims[i] = damp(c.dims[i]!, Math.min(xrayAlpha, focusAlpha), 6, dt);
      const a = c.dims[i]!;
      for (const m of layerMats[i]!) {
        const transparent = a < 0.995;
        if (m.transparent !== transparent) {
          m.transparent = transparent;
          m.needsUpdate = true;
        }
        m.opacity = a;
        m.depthWrite = a > 0.6;
      }
    }

    c.hl = damp(c.hl, selectedChamber === null ? 0 : 0.55, 8, dt);
    mats.highlight.opacity = c.hl;
  });

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    if (!interactive) return;
    e.stopPropagation();
    document.body.style.cursor = "pointer";
  };
  const onOut = () => {
    if (interactive) document.body.style.cursor = "";
  };

  const setLayer = (i: number) => (el: THREE.Group | null) => {
    layerRefs.current[i] = el;
  };

  return (
    <group ref={root} dispose={null}>
      {/* 0 · Base ring */}
      <group ref={setLayer(0)}>
        <mesh geometry={geo.baseGeo} material={mats.base} />
      </group>

      {/* 1 · Housing */}
      <group ref={setLayer(1)}>
        <mesh geometry={geo.housingGeo} material={mats.housing} />
      </group>

      {/* 2 · Indexer: ratchet ring (turns with tray), shaft, pawl, spring */}
      <group ref={setLayer(2)}>
        <group ref={ringRef} position={[0, DIM.FLOOR, 0]}>
          <mesh geometry={geo.ratchetGeo} material={mats.mech} />
        </group>
        <mesh geometry={geo.shaftGeo} material={mats.steel} position={[0, (DIM.LID_Y + DIM.FLOOR) / 2, 0]} />
        <mesh geometry={geo.pawlGeo} material={mats.steel} position={polar(1.12, -0.32, DIM.FLOOR + 0.03)} rotation={[0, -0.32 + Math.PI / 2, 0]} />
        <mesh geometry={geo.springGeo} material={mats.steel} position={polar(1.18, 0.22, DIM.FLOOR + 0.04)} rotation={[0, 0.22 + Math.PI / 2, 0]} />
      </group>

      {/* 3 · Tray with six chambers + inserts */}
      <group ref={setLayer(3)}>
        <group ref={trayRef}>
          <mesh geometry={geo.trayFloorGeo} material={mats.tray} position={[0, DIM.TRAY_Y + DIM.TRAY_FLOOR_H / 2, 0]} />
          <mesh geometry={geo.trayWallGeo} material={mats.tray} position={[0, (DIM.TRAY_TOP + DIM.TRAY_Y) / 2, 0]} />
          <mesh geometry={geo.trayLipGeo} material={mats.tray} position={[0, DIM.TRAY_TOP, 0]} />
          <mesh geometry={geo.trayHubGeo} material={mats.tray} position={[0, (DIM.TRAY_TOP + DIM.TRAY_Y) / 2, 0]} />
          {Array.from({ length: 6 }, (_, i) => {
            const a = (i * Math.PI) / 3 + Math.PI / 6;
            return (
              <mesh
                key={`d${i}`}
                geometry={geo.dividerGeo}
                material={mats.tray}
                position={polar((DIM.HUB_R + DIM.TRAY_R) / 2, a, (DIM.TRAY_TOP + DIM.TRAY_Y) / 2)}
                rotation={[0, a, 0]}
              />
            );
          })}
          {Array.from({ length: 6 }, (_, i) => (
            <Chamber
              key={`c${i}`}
              index={i}
              geo={geo}
              mats={mats}
              eaten={eaten?.[i] ?? false}
              selected={selectedChamber === i}
              interactive={interactive}
              onSelect={onSelectChamber}
              onOver={onOver}
              onOut={onOut}
            />
          ))}
        </group>
      </group>

      {/* 4 · Lid */}
      <group ref={setLayer(4)}>
        <mesh geometry={geo.lidGeo} material={mats.lid} position={[0, DIM.LID_Y, 0]} />
        <mesh geometry={geo.trackGeo} material={mats.lid} position={[0, DIM.LID_TOP + 0.002, 0]} />
      </group>

      {/* 5 · Shutter + hub (rotates about centre) */}
      <group ref={setLayer(5)}>
        <group ref={shutterRef} position={[0, DIM.LID_TOP + 0.028, 0]}>
          <mesh geometry={geo.shutterGeo} material={mats.shutter} />
          <mesh geometry={geo.ridgeGeo} material={mats.shutter} position={[0, 0.06, 0]} />
          <mesh geometry={geo.hubGeo} material={mats.hub} position={[0, 0.05, 0]} />
          <mesh geometry={geo.hubRingGeo} material={mats.steel} position={[0, 0.2, 0]} />
        </group>
      </group>
    </group>
  );
}

function Chamber({
  index,
  geo,
  mats,
  eaten,
  selected,
  interactive,
  onSelect,
  onOver,
  onOut,
}: {
  index: number;
  geo: ReturnType<typeof buildGeometries>;
  mats: Record<string, THREE.Material>;
  eaten: boolean;
  selected: boolean;
  interactive: boolean;
  onSelect?: (i: number) => void;
  onOver: (e: ThreeEvent<PointerEvent>) => void;
  onOut: () => void;
}) {
  const a = (index * Math.PI) / 3;
  const y = insertFloorY;
  const kibble = (offsets: [number, number, number][]) =>
    !eaten &&
    offsets.map(([dr, da, dy], k) => (
      <mesh
        key={`k${k}`}
        geometry={geo.kibbleGeo}
        material={mats.kibble}
        position={polar(DIM.CHAMBER_R + dr, a + da, y + 0.03 + dy)}
        rotation={[k * 0.7, k * 1.3, k * 0.4]}
      />
    ));

  let insert: React.ReactNode = null;
  switch (index) {
    case 0:
      insert = (
        <>
          <mesh geometry={geo.cupGeo} material={mats.insert} position={polar(DIM.CHAMBER_R, a, y + 0.02)} />
          {kibble([[0, 0, 0], [0.08, 0.05, 0], [-0.06, -0.06, 0], [0.02, -0.1, 0.02]])}
        </>
      );
      break;
    case 1:
      insert = (
        <>
          {[-0.18, 0, 0.18].map((dr, k) => (
            <mesh key={k} geometry={geo.ridgeBarGeo} material={mats.insert} position={polar(DIM.CHAMBER_R + dr, a, y + 0.022)} rotation={[0, a + Math.PI / 2, 0]} />
          ))}
          {kibble([[-0.09, 0.02, 0], [0.09, -0.06, 0], [0.09, 0.08, 0]])}
        </>
      );
      break;
    case 2:
      insert = (
        <>
          {[
            [0, 0],
            [0.17, 0.14],
            [0.17, -0.14],
            [-0.17, 0.2],
            [-0.17, -0.2],
          ].map(([dr, da], k) => (
            <mesh key={k} geometry={geo.pillarGeo} material={mats.insert} position={polar(DIM.CHAMBER_R + dr!, a + da!, y + 0.08)} />
          ))}
          {kibble([[0.08, 0.02, 0], [-0.09, -0.04, 0], [0.02, 0.18, 0]])}
        </>
      );
      break;
    case 3:
      insert = (
        <>
          {kibble([[0, 0.02, 0], [0.06, -0.06, 0]])}
          <group position={polar(DIM.CHAMBER_R - 0.2, a, y + 0.03)} rotation={[0, a, 0]}>
            <mesh geometry={geo.flapGeo} material={mats.insert} position={[0, 0.07, 0.21]} rotation={[-0.32, 0, 0]} />
          </group>
        </>
      );
      break;
    case 4:
      insert = (
        <>
          {kibble([[0.02, 0.0, 0]])}
          <group position={polar(DIM.CHAMBER_R, a, y)} rotation={[0, a, 0.28]}>
            <mesh geometry={geo.domeGeo} material={mats.insert} />
            <mesh geometry={geo.pinGeo} material={mats.steel} position={[0, 0.17, 0]} />
          </group>
        </>
      );
      break;
    case 5:
      insert = (
        <>
          <mesh geometry={geo.wellGeo} material={mats.insert} position={polar(DIM.CHAMBER_R, a, y + 0.1)} />
          <mesh geometry={geo.wellLipGeo} material={mats.insert} position={polar(DIM.CHAMBER_R, a, y + 0.2)} />
          {kibble([[0, 0, 0.02], [0.04, 0.04, 0.05]])}
        </>
      );
      break;
  }

  return (
    <group>
      {insert}
      {selected && <mesh geometry={geo.chamberGeo} material={mats.highlight} position={[0, y + 0.004, 0]} rotation={[0, a, 0]} />}
      {interactive && (
        <mesh
          geometry={geo.chamberGeo}
          material={mats.hit}
          position={[0, DIM.TRAY_TOP, 0]}
          rotation={[0, a, 0]}
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(index);
          }}
          onPointerOver={onOver}
          onPointerOut={onOut}
        />
      )}
    </group>
  );
}
