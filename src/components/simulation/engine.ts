/**
 * SniffOrbit puzzle simulation — a pure reducer modelling the proposed mechanism.
 *
 * Physical model:
 *  - Six chambers on a tray under a fixed lid. One window (lid position 0).
 *  - `trayPos` = index of the chamber currently under the window.
 *  - The shutter opens the window once pushed past OPEN_THRESHOLD.
 *  - Releasing the shutter after a FULL stroke lets the spring return it, and
 *    the ratchet advances the tray by one chamber. Partial strokes don't index.
 *  - Some inserts need an extra action before the reward can be reached
 *    (Lift Flap → lift, Tilt Dome → tip).
 *  - Scent ports sit above lid positions 1–5; sniffing reports whether the
 *    chamber currently below holds an undiscovered treat.
 */
import { DISCOVERIES } from "@/content/discoveries";

export const OPEN_THRESHOLD = 0.82;

export type Chamber = { loaded: boolean; found: boolean; prepared: boolean };

export type SimState = {
  phase: "setup" | "play" | "complete";
  chambers: Chamber[];
  startPos: number;
  trayPos: number;
  shutter: number;
  strokeComplete: boolean;
  cycles: number;
  partialPushes: number;
  sniffs: number;
  lastSniff: { port: number; chamber: number; strong: boolean } | null;
  message: string;
  startedAt: number | null;
  finishedAt: number | null;
  xray: boolean;
};

export type SimAction =
  | { type: "toggleLoad"; chamber: number }
  | { type: "setStart"; chamber: number }
  | { type: "loadAll" }
  | { type: "start"; now: number }
  | { type: "shutter"; value: number }
  | { type: "release" }
  | { type: "prepare" }
  | { type: "retrieve"; now: number }
  | { type: "sniff"; port: number }
  | { type: "toggleXray" }
  | { type: "replay" }
  | { type: "restart" };

export function initialSimState(): SimState {
  return {
    phase: "setup",
    chambers: DISCOVERIES.map(() => ({ loaded: true, found: false, prepared: false })),
    startPos: 0,
    trayPos: 0,
    shutter: 0,
    strokeComplete: false,
    cycles: 0,
    partialPushes: 0,
    sniffs: 0,
    lastSniff: null,
    message: "Choose which chambers to load and where to start, then press Start.",
    startedAt: null,
    finishedAt: null,
    xray: false,
  };
}

export const needsPreparation = (chamber: number) => chamber === 3 || chamber === 4;
export const preparationVerb = (chamber: number) => (chamber === 3 ? "Lift the flap" : "Tip the dome");

export function isWindowOpen(s: SimState) {
  return s.shutter >= OPEN_THRESHOLD;
}

/** Chamber index under a given lid position (0 = window). */
export function chamberAtPort(s: SimState, port: number) {
  return (s.trayPos + port) % 6;
}

export function loadedCount(s: SimState) {
  return s.chambers.filter((c) => c.loaded).length;
}
export function foundCount(s: SimState) {
  return s.chambers.filter((c) => c.found).length;
}

export function canRetrieve(s: SimState) {
  if (s.phase !== "play" || !isWindowOpen(s)) return false;
  const c = s.chambers[s.trayPos]!;
  return c.loaded && !c.found && (!needsPreparation(s.trayPos) || c.prepared);
}

export function simReducer(s: SimState, a: SimAction): SimState {
  switch (a.type) {
    case "toggleLoad": {
      if (s.phase !== "setup") return s;
      const chambers = s.chambers.map((c, i) => (i === a.chamber ? { ...c, loaded: !c.loaded } : c));
      const name = DISCOVERIES[a.chamber]!.name;
      return { ...s, chambers, message: `${name} ${chambers[a.chamber]!.loaded ? "loaded with a treat" : "left empty"}.` };
    }
    case "loadAll":
      if (s.phase !== "setup") return s;
      return { ...s, chambers: s.chambers.map((c) => ({ ...c, loaded: true })), message: "All six chambers loaded." };
    case "setStart":
      if (s.phase !== "setup") return s;
      return {
        ...s,
        startPos: a.chamber,
        trayPos: a.chamber,
        message: `Tray turned so ${DISCOVERIES[a.chamber]!.name} starts under the window.`,
      };
    case "start":
      if (s.phase !== "setup" || loadedCount(s) === 0) {
        return { ...s, message: "Load at least one chamber before starting." };
      }
      return {
        ...s,
        phase: "play",
        startedAt: a.now,
        message: "Your turn to be the dog. Sniff the ports, then push the shutter all the way open.",
      };
    case "shutter": {
      if (s.phase !== "play") return s;
      const value = Math.max(0, Math.min(1, a.value));
      const opened = value >= OPEN_THRESHOLD && s.shutter < OPEN_THRESHOLD;
      let message = s.message;
      if (opened) {
        const c = s.chambers[s.trayPos]!;
        const d = DISCOVERIES[s.trayPos]!;
        if (!c.loaded) message = `Window open — ${d.name} is empty. Release to move on.`;
        else if (c.found) message = `Window open — ${d.name} was already emptied.`;
        else if (needsPreparation(s.trayPos) && !c.prepared) message = `Window open — a treat is hidden under the ${d.name}. ${preparationVerb(s.trayPos)} first.`;
        else message = `Window open — there's a treat in the ${d.name}! Retrieve it.`;
      }
      return { ...s, shutter: value, strokeComplete: s.strokeComplete || value >= 0.98, message };
    }
    case "release": {
      if (s.phase !== "play" || s.shutter === 0) return { ...s, shutter: 0 };
      if (!s.strokeComplete) {
        return {
          ...s,
          shutter: 0,
          partialPushes: s.partialPushes + 1,
          message: "Not quite — the ratchet only clicks after a full stroke. Push the shutter all the way.",
        };
      }
      const trayPos = (s.trayPos + 1) % 6;
      return {
        ...s,
        shutter: 0,
        strokeComplete: false,
        trayPos,
        cycles: s.cycles + 1,
        lastSniff: null,
        message: `Click — the spring closed the shutter and the tray indexed to chamber 0${trayPos + 1}.`,
      };
    }
    case "prepare": {
      if (s.phase !== "play" || !isWindowOpen(s) || !needsPreparation(s.trayPos)) return s;
      const chambers = s.chambers.map((c, i) => (i === s.trayPos ? { ...c, prepared: true } : c));
      return { ...s, chambers, message: s.trayPos === 3 ? "Flap lifted. The treat is reachable." : "Dome tipped aside. The treat is reachable." };
    }
    case "retrieve": {
      if (!canRetrieve(s)) return s;
      const chambers = s.chambers.map((c, i) => (i === s.trayPos ? { ...c, found: true } : c));
      const done = chambers.every((c) => !c.loaded || c.found);
      const next: SimState = {
        ...s,
        chambers,
        message: done
          ? "Every treat discovered! That's the full orbit."
          : `Found it! ${chambers.filter((c) => c.found).length} of ${chambers.filter((c) => c.loaded).length} discovered. Release the shutter to index on.`,
      };
      return done ? { ...next, phase: "complete", finishedAt: a.now } : next;
    }
    case "sniff": {
      if (s.phase !== "play") return s;
      const chamber = chamberAtPort(s, a.port);
      const c = s.chambers[chamber]!;
      const strong = c.loaded && !c.found;
      return {
        ...s,
        sniffs: s.sniffs + 1,
        lastSniff: { port: a.port, chamber, strong },
        message: strong
          ? `Sniff… a strong scent from port ${a.port}. Something tasty is ${a.port} click${a.port === 1 ? "" : "s"} away.`
          : `Sniff… only a faint scent from port ${a.port}.`,
      };
    }
    case "toggleXray":
      return { ...s, xray: !s.xray };
    case "replay":
      return {
        ...s,
        phase: "play",
        chambers: s.chambers.map((c) => ({ ...c, found: false, prepared: false })),
        trayPos: s.startPos,
        shutter: 0,
        strokeComplete: false,
        cycles: 0,
        partialPushes: 0,
        sniffs: 0,
        lastSniff: null,
        startedAt: Date.now(),
        finishedAt: null,
        message: "Same setup, fresh treats. Go again!",
      };
    case "restart":
      return { ...initialSimState(), message: "New puzzle. Choose the chambers to load and the starting point." };
  }
}
