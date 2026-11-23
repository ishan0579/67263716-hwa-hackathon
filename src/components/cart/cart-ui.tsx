"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type CartUI = { open: boolean; openCart: () => void; closeCart: () => void };
const Ctx = createContext<CartUI | null>(null);

export function CartUIProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openCart = useCallback(() => setOpen(true), []);
  const closeCart = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ open, openCart, closeCart }), [open, openCart, closeCart]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCartUI() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCartUI must be used within CartUIProvider");
  return c;
}
