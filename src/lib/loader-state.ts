"use client";

import { useSyncExternalStore } from "react";

/**
 * Tiny shared signal: has the page loader finished (or been skipped)?
 * Entrance animations wait for it so they play as the curtain lifts.
 */
let done = false;
const listeners = new Set<() => void>();

export function markLoaderDone() {
  if (done) return;
  done = true;
  listeners.forEach((l) => l());
}

export function useLoaderDone() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => done,
    () => false,
  );
}
