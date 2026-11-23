/**
 * Procedural geometry for SniffOrbit ONE.
 * Units: 1 = 10 cm (Standard is Ø 28 cm). +Y is up. World angle 0 points to +Z
 * (towards the default camera); positive angles rotate counter-clockwise when
 * seen from above (three.js rotation.y convention).
 */
import * as THREE from "three";

export const DIM = {
  R: 1.4,
  BASE_TOP: 0.11,
  FLOOR: 0.2,
  RING_H: 0.04,
  TRAY_Y: 0.245,
  TRAY_FLOOR_H: 0.03,
  TRAY_TOP: 0.48,
  TRAY_R: 1.27,
  HUB_R: 0.3,
  LID_Y: 0.54,
  LID_TOP: 0.625,
  WINDOW_HALF: (26 * Math.PI) / 180,
  SHUTTER_HALF: (33 * Math.PI) / 180,
  SHUTTER_OPEN: (64 * Math.PI) / 180,
  CHAMBER_R: 0.8,
};

export const insertFloorY = DIM.TRAY_Y + DIM.TRAY_FLOOR_H;

/** World polar → XZ position. */
export function polar(r: number, a: number, y = 0): [number, number, number] {
  return [r * Math.sin(a), y, r * Math.cos(a)];
}

/** World angle → 2D shape coords, for shapes later rotated by -90° about X. */
function sp(r: number, a: number) {
  return new THREE.Vector2(r * Math.sin(a), -r * Math.cos(a));
}

/** Annular sector with rounded corners, in shape space. */
function sectorPath<T extends THREE.Path>(target: T, ri: number, ro: number, a0: number, a1: number, c: number, samples = 24) {
  const dO = c / ro;
  const dI = c / ri;
  const start = sp(ro, a0 + dO);
  target.moveTo(start.x, start.y);
  for (let i = 1; i <= samples; i++) {
    const p = sp(ro, a0 + dO + ((a1 - dO - (a0 + dO)) * i) / samples);
    target.lineTo(p.x, p.y);
  }
  let k = sp(ro, a1);
  let e = sp(ro - c, a1);
  target.quadraticCurveTo(k.x, k.y, e.x, e.y);
  e = sp(ri + c, a1);
  target.lineTo(e.x, e.y);
  k = sp(ri, a1);
  e = sp(ri, a1 - dI);
  target.quadraticCurveTo(k.x, k.y, e.x, e.y);
  for (let i = 1; i <= samples; i++) {
    const p = sp(ri, a1 - dI - ((a1 - dI - (a0 + dI)) * i) / samples);
    target.lineTo(p.x, p.y);
  }
  k = sp(ri, a0);
  e = sp(ri + c, a0);
  target.quadraticCurveTo(k.x, k.y, e.x, e.y);
  e = sp(ro - c, a0);
  target.lineTo(e.x, e.y);
  k = sp(ro, a0);
  target.quadraticCurveTo(k.x, k.y, start.x, start.y);
  return target;
}

export type Quality = "high" | "low";

export function buildGeometries(q: Quality) {
  const seg = q === "high" ? 128 : 56;
  const curve = q === "high" ? 64 : 28;
  const bevelSeg = q === "high" ? 5 : 2;

  /* Non-slip base ring (closed lathe loop) */
  const base = new THREE.Path();
  base.moveTo(1.1, 0);
  base.lineTo(1.31, 0);
  base.quadraticCurveTo(1.395, 0, 1.4, 0.065);
  base.lineTo(1.402, DIM.BASE_TOP);
  base.lineTo(1.1, DIM.BASE_TOP);
  base.lineTo(1.1, 0);
  const baseGeo = new THREE.LatheGeometry(base.getPoints(10), seg);

  /* Housing: soft puck-shaped bowl */
  const h = new THREE.Path();
  h.moveTo(0, 0.1);
  h.lineTo(1.25, 0.1);
  h.quadraticCurveTo(1.395, 0.1, 1.402, 0.2);
  h.lineTo(1.412, 0.41);
  h.quadraticCurveTo(1.415, 0.505, 1.355, 0.505);
  h.lineTo(1.33, 0.505);
  h.lineTo(1.33, DIM.FLOOR + 0.02);
  h.quadraticCurveTo(1.33, DIM.FLOOR, 1.3, DIM.FLOOR);
  h.lineTo(0, DIM.FLOOR);
  const housingGeo = new THREE.LatheGeometry(h.getPoints(12), seg);

  /* Lid: disc with access window + scent ports, softly bevelled */
  const lidShape = new THREE.Shape();
  lidShape.absarc(0, 0, DIM.R - 0.03, 0, Math.PI * 2, false);
  lidShape.holes.push(sectorPath(new THREE.Path(), 0.46, 1.17, -DIM.WINDOW_HALF, DIM.WINDOW_HALF, 0.09));
  for (let c = 1; c < 6; c++) {
    const a = (c * Math.PI) / 3;
    for (const off of [-0.13, 0, 0.13]) {
      const p = sp(0.98, a + off);
      lidShape.holes.push(new THREE.Path().absarc(p.x, p.y, 0.046, 0, Math.PI * 2, true));
    }
    const inner = sp(0.7, a);
    lidShape.holes.push(new THREE.Path().absarc(inner.x, inner.y, 0.036, 0, Math.PI * 2, true));
  }
  const lidGeo = new THREE.ExtrudeGeometry(lidShape, {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.03,
    bevelSegments: bevelSeg,
    curveSegments: curve,
  });
  lidGeo.rotateX(-Math.PI / 2);

  /* Shutter: sector plate that rotates about the centre hub */
  const shutterShape = sectorPath(new THREE.Shape(), 0.24, 1.27, -DIM.SHUTTER_HALF, DIM.SHUTTER_HALF, 0.1, 28);
  const shutterGeo = new THREE.ExtrudeGeometry(shutterShape, {
    depth: 0.028,
    bevelEnabled: true,
    bevelThickness: 0.026,
    bevelSize: 0.024,
    bevelSegments: bevelSeg,
    curveSegments: curve,
  });
  shutterGeo.rotateX(-Math.PI / 2);

  /* Nose ridge on the shutter (grip) */
  const ridgeArc = 2 * (DIM.SHUTTER_HALF - 0.12);
  const ridgeGeo = new THREE.TorusGeometry(1.1, 0.038, 10, 40, ridgeArc);
  ridgeGeo.rotateX(-Math.PI / 2);
  ridgeGeo.rotateY(-(Math.PI / 2 + ridgeArc / 2));

  /* Centre hub button */
  const hub = new THREE.Path();
  hub.moveTo(0, 0);
  hub.lineTo(0.3, 0);
  hub.quadraticCurveTo(0.33, 0, 0.33, 0.04);
  hub.lineTo(0.32, 0.09);
  hub.quadraticCurveTo(0.3, 0.14, 0.2, 0.15);
  hub.lineTo(0, 0.155);
  const hubGeo = new THREE.LatheGeometry(hub.getPoints(8), Math.min(seg, 64));
  const hubRingGeo = new THREE.TorusGeometry(0.2, 0.012, 6, 48);
  hubRingGeo.rotateX(-Math.PI / 2);

  /* Perimeter track groove on the lid (guides the shutter) */
  const trackGeo = new THREE.TorusGeometry(1.31, 0.012, 6, seg);
  trackGeo.rotateX(-Math.PI / 2);

  /* Ratchet indexing ring (6 teeth) */
  const ratchet = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const b = (i * Math.PI) / 3;
    const p0 = sp(0.9, b);
    const p1 = sp(1.06, b + (Math.PI / 3) * 0.82);
    const p2 = sp(0.9, b + (Math.PI / 3) * 0.82 + 0.02);
    if (i === 0) ratchet.moveTo(p0.x, p0.y);
    else ratchet.lineTo(p0.x, p0.y);
    ratchet.lineTo(p1.x, p1.y);
    ratchet.lineTo(p2.x, p2.y);
  }
  ratchet.closePath();
  ratchet.holes.push(new THREE.Path().absarc(0, 0, 0.42, 0, Math.PI * 2, true));
  const ratchetGeo = new THREE.ExtrudeGeometry(ratchet, {
    depth: DIM.RING_H,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 1,
    curveSegments: 24,
  });
  ratchetGeo.rotateX(-Math.PI / 2);

  /* Spring (helix) for the shutter return */
  class Helix extends THREE.Curve<THREE.Vector3> {
    public constructor() {
      super();
    }
    getPoint(t: number, target = new THREE.Vector3()) {
      const turns = 9;
      const a = t * Math.PI * 2 * turns;
      return target.set(Math.cos(a) * 0.045, Math.sin(a) * 0.045, (t - 0.5) * 0.42);
    }
  }
  const springGeo = new THREE.TubeGeometry(new Helix(), q === "high" ? 200 : 90, 0.008, 6, false);

  /* Tray */
  const trayFloorGeo = new THREE.CylinderGeometry(DIM.TRAY_R, DIM.TRAY_R, DIM.TRAY_FLOOR_H, seg);
  const trayWallGeo = new THREE.CylinderGeometry(DIM.TRAY_R + 0.015, DIM.TRAY_R, DIM.TRAY_TOP - DIM.TRAY_Y, seg, 1, true);
  const trayLipGeo = new THREE.TorusGeometry(DIM.TRAY_R + 0.012, 0.018, 8, seg);
  trayLipGeo.rotateX(Math.PI / 2);
  const trayHubGeo = new THREE.CylinderGeometry(DIM.HUB_R, DIM.HUB_R + 0.02, DIM.TRAY_TOP - DIM.TRAY_Y, Math.min(seg, 64));
  const dividerGeo = new THREE.BoxGeometry(0.034, DIM.TRAY_TOP - DIM.TRAY_Y - 0.01, DIM.TRAY_R - DIM.HUB_R);

  /* Chamber hit area / highlight (flat sector) */
  const chamberShape = sectorPath(new THREE.Shape(), DIM.HUB_R + 0.04, DIM.TRAY_R - 0.03, -Math.PI / 6 + 0.03, Math.PI / 6 - 0.03, 0.06, 16);
  const chamberGeo = new THREE.ShapeGeometry(chamberShape, 12);
  chamberGeo.rotateX(-Math.PI / 2);

  /* Inserts */
  const cupGeo = new THREE.TorusGeometry(0.22, 0.022, 8, 40);
  cupGeo.rotateX(Math.PI / 2);
  const ridgeBarGeo = new THREE.CapsuleGeometry(0.022, 0.36, 4, 8);
  ridgeBarGeo.rotateZ(Math.PI / 2);
  const pillarGeo = new THREE.CapsuleGeometry(0.04, 0.08, 4, 12);
  const flapGeo = new THREE.BoxGeometry(0.46, 0.022, 0.34);
  const domeGeo = new THREE.SphereGeometry(0.19, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const wellGeo = new THREE.CylinderGeometry(0.17, 0.15, 0.2, 32, 1, true);
  const wellLipGeo = new THREE.TorusGeometry(0.17, 0.018, 8, 32);
  wellLipGeo.rotateX(Math.PI / 2);
  const pinGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8);

  const kibbleGeo = new THREE.DodecahedronGeometry(0.05, 0);
  kibbleGeo.scale(1, 0.6, 1);

  const shaftGeo = new THREE.CylinderGeometry(0.07, 0.07, DIM.LID_Y - DIM.FLOOR, 24);
  const pawlGeo = new THREE.BoxGeometry(0.06, 0.05, 0.34);

  return {
    baseGeo,
    housingGeo,
    lidGeo,
    shutterGeo,
    ridgeGeo,
    hubGeo,
    hubRingGeo,
    trackGeo,
    ratchetGeo,
    springGeo,
    trayFloorGeo,
    trayWallGeo,
    trayLipGeo,
    trayHubGeo,
    dividerGeo,
    chamberGeo,
    cupGeo,
    ridgeBarGeo,
    pillarGeo,
    flapGeo,
    domeGeo,
    wellGeo,
    wellLipGeo,
    pinGeo,
    kibbleGeo,
    shaftGeo,
    pawlGeo,
  };
}

export type Geometries = ReturnType<typeof buildGeometries>;

export function disposeAll(g: Record<string, { dispose: () => void }>) {
  for (const v of Object.values(g)) v.dispose();
}
