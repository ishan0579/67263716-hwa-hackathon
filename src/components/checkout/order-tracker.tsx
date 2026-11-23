"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { CustomerOrderView } from "@/server/services/orders";
import { formatDate } from "@/lib/utils";
import { Button } from "../ui/button";
import { TextField } from "../ui/field";
import { Alert, Search } from "../ui/icons";
import { OrderDetails, StatusBadge, Timeline } from "./order-details";

export function OrderTracker({ initialRef }: { initialRef: string }) {
  const [ref, setRef] = useState(initialRef);
  const [key, setKey] = useState("");
  const [errors, setErrors] = useState<{ ref?: string; key?: string }>({});
  const [state, setState] = useState<{ kind: "idle" | "loading" } | { kind: "error"; message: string } | { kind: "found"; order: CustomerOrderView }>({
    kind: "idle",
  });
  const auto = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const lookup = async (orderNumber: string, trackingKey: string) => {
    const next: typeof errors = {};
    if (!/^SO-[0-9A-Z]{4}-[0-9A-Z]{4}$/i.test(orderNumber.trim())) next.ref = "References look like SO-XXXX-XXXX.";
    if (trackingKey.replace(/[^0-9A-Za-z]/g, "").length !== 20) next.key = "Tracking keys have 20 letters and numbers (dashes optional).";
    setErrors(next);
    if (next.ref || next.key) return;
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderNumber: orderNumber.trim(), trackingKey }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message ?? "Lookup failed.");
      setState({ kind: "found", order: body.order });
      requestAnimationFrame(() => resultRef.current?.focus());
    } catch (e) {
      setState({ kind: "error", message: (e as Error).message });
    }
  };

  // Tracking links carry the key in the URL fragment (#key=…), which never reaches servers or logs.
  useEffect(() => {
    if (auto.current) return;
    auto.current = true;
    const m = window.location.hash.match(/key=([0-9A-Za-z-]+)/);
    if (m) {
      // The URL fragment is only readable after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setKey(m[1]!);
      history.replaceState(null, "", window.location.pathname + window.location.search);
      if (initialRef) void lookup(initialRef, m[1]!);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid gap-12 lg:grid-cols-12">
      <form
        className="space-y-5 lg:col-span-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void lookup(ref, key);
        }}
      >
        <TextField
          label="Order reference"
          placeholder="SO-XXXX-XXXX"
          autoCapitalize="characters"
          spellCheck={false}
          value={ref}
          onChange={(e) => setRef(e.target.value.toUpperCase())}
          error={errors.ref}
        />
        <TextField
          label="Tracking key"
          placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          value={key}
          onChange={(e) => setKey(e.target.value.toUpperCase())}
          error={errors.key}
          hint="Shown once on your order confirmation."
        />
        <Button type="submit" size="lg" className="w-full" loading={state.kind === "loading"} icon={<Search size={18} />}>
          Find my order
        </Button>
        <p className="text-xs leading-relaxed text-graphite/55">Lookups are rate limited. Failed attempts don&apos;t reveal whether a reference exists.</p>
      </form>

      <div className="lg:col-span-7 lg:col-start-6" aria-live="polite">
        <AnimatePresence mode="wait">
          {state.kind === "error" && (
            <motion.p key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="alert" className="flex gap-3 rounded-2xl bg-coral-200/70 p-5 text-[#6b230b]">
              <Alert size={20} className="shrink-0" /> {state.message}
            </motion.p>
          )}
          {state.kind === "found" && (
            <motion.div
              key="found"
              ref={resultRef}
              tabIndex={-1}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-10 outline-none"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-eyebrow text-graphite/55">Order {state.order.orderNumber}</p>
                  <p className="text-display-4 mt-2">{state.order.statusLabel}</p>
                  <p className="mt-1 text-sm text-graphite/60">Placed {formatDate(state.order.createdAt, true)}</p>
                </div>
                <StatusBadge status={state.order.status} label={state.order.isDemo ? "Test order" : state.order.statusLabel} />
              </div>
              <Timeline order={state.order} />
              <OrderDetails order={state.order} />
            </motion.div>
          )}
          {(state.kind === "idle" || state.kind === "loading") && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid min-h-64 place-items-center rounded-[var(--radius-panel)] border border-dashed border-forest/20 p-8 text-center text-graphite/60">
              <p>{state.kind === "loading" ? "Looking up your order…" : "Your order status, timeline and details will appear here."}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
