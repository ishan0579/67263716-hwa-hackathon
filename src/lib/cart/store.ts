"use client";

import { useSyncExternalStore } from "react";
import { MAX_QTY_PER_LINE } from "@/lib/validation/checkout";

/**
 * Browser cart persisted in localStorage and synced across tabs.
 * It stores variant ids + quantities plus a *display snapshot* so the drawer
 * renders instantly; authoritative prices and stock always come from the
 * server (/api/cart/validate, /api/quote) before checkout.
 */
export type CartLine = {
  variantId: string;
  quantity: number;
  name: string;
  colorName: string;
  colorHex: string;
  accentHex: string;
  sizeLabel: string;
  priceCents: number;
  sku: string;
};

const KEY = "snifforbit.cart.v1";
const EMPTY: CartLine[] = [];
let state: CartLine[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function isLine(x: unknown): x is CartLine {
  const l = x as CartLine;
  return (
    !!l &&
    typeof l.variantId === "string" &&
    Number.isInteger(l.quantity) &&
    l.quantity > 0 &&
    typeof l.name === "string" &&
    typeof l.priceCents === "number"
  );
}

function read(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isLine).slice(0, 20) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  state = read();
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      state = read();
      listeners.forEach((l) => l());
    }
  });
}

function commit(next: CartLine[]) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage may be unavailable (private mode); the cart still works for this tab */
  }
  listeners.forEach((l) => l());
}

export const cartStore = {
  subscribe(fn: () => void) {
    ensureLoaded();
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  getSnapshot() {
    ensureLoaded();
    return state;
  },
  getServerSnapshot() {
    return EMPTY;
  },
  add(line: Omit<CartLine, "quantity">, quantity: number, maxQuantity = MAX_QTY_PER_LINE) {
    ensureLoaded();
    const existing = state.find((l) => l.variantId === line.variantId);
    const cap = Math.max(0, Math.min(maxQuantity, MAX_QTY_PER_LINE));
    if (existing) {
      const q = Math.min(existing.quantity + quantity, cap);
      commit(state.map((l) => (l.variantId === line.variantId ? { ...l, ...line, quantity: q } : l)));
      return q - existing.quantity;
    }
    const q = Math.min(quantity, cap);
    if (q <= 0) return 0;
    commit([...state, { ...line, quantity: q }]);
    return q;
  },
  setQuantity(variantId: string, quantity: number) {
    ensureLoaded();
    if (quantity <= 0) return cartStore.remove(variantId);
    commit(state.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.min(quantity, MAX_QTY_PER_LINE) } : l)));
  },
  remove(variantId: string) {
    ensureLoaded();
    commit(state.filter((l) => l.variantId !== variantId));
  },
  restore(line: CartLine) {
    ensureLoaded();
    if (!state.some((l) => l.variantId === line.variantId)) commit([...state, line]);
  },
  clear() {
    ensureLoaded();
    commit(EMPTY);
  },
  /** Refresh display snapshots with server data (names/prices may change). */
  reconcile(updates: { variantId: string; name?: string; priceCents?: number; colorName?: string; sizeLabel?: string }[]) {
    ensureLoaded();
    let changed = false;
    const next = state.map((l) => {
      const u = updates.find((x) => x.variantId === l.variantId);
      if (!u) return l;
      const merged = {
        ...l,
        name: u.name || l.name,
        priceCents: u.priceCents ?? l.priceCents,
        colorName: u.colorName || l.colorName,
        sizeLabel: u.sizeLabel || l.sizeLabel,
      };
      if (merged.name !== l.name || merged.priceCents !== l.priceCents) changed = true;
      return merged;
    });
    if (changed) commit(next);
  },
};

export function useCartLines() {
  return useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot);
}

export function useCartCount() {
  return useCartLines().reduce((s, l) => s + l.quantity, 0);
}
