"use client";

import { cosR, sinR } from "@/lib/utils";
import { motion } from "motion/react";
import { useState } from "react";
import { Check, Copy } from "../ui/icons";

/** The brand mark assembles and the final chamber lights up — a quiet celebration. */
export function OrderCelebration() {
  const beads = Array.from({ length: 6 }, (_, i) => {
    const a = ((-90 + i * 60) * Math.PI) / 180;
    return { x: 100 + 64 * cosR(a), y: 100 + 64 * sinR(a), i };
  });
  return (
    <svg viewBox="0 0 200 200" className="mx-auto w-full max-w-[320px]" aria-hidden="true">
      <motion.circle
        cx="100"
        cy="100"
        r="64"
        fill="none"
        stroke="#F7F3EA"
        strokeOpacity=".9"
        strokeWidth="6"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1] }}
      />
      {beads.map((b) => (
        <motion.circle
          key={b.i}
          cx={b.x}
          cy={b.y}
          r="9"
          initial={{ scale: 0, fill: "#F7F3EA" }}
          animate={{ scale: 1, fill: "#B9E5DB" }}
          transition={{ delay: 0.5 + b.i * 0.12, type: "spring", stiffness: 300, damping: 15 }}
        />
      ))}
      <motion.circle cx="100" cy="100" r="34" fill="#FF794B" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.3, type: "spring", stiffness: 260, damping: 14 }} />
      <motion.path
        d="M86 101 l10 10 l20 -22"
        fill="none"
        stroke="#0C3438"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 1.6, duration: 0.5 }}
      />
    </svg>
  );
}

export function TrackingKeyCard({ orderNumber, trackingKey }: { orderNumber: string; trackingKey: string }) {
  const [copied, setCopied] = useState<"key" | "link" | null>(null);
  const copy = async (what: "key" | "link") => {
    const text = what === "key" ? trackingKey : `${window.location.origin}/order/track?ref=${orderNumber}#key=${trackingKey}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  };
  return (
    <div className="grid gap-6 rounded-[var(--radius-panel)] bg-mint/60 p-6 sm:p-8 lg:grid-cols-12 lg:items-center">
      <div className="lg:col-span-6">
        <p className="text-eyebrow text-forest-500">Your private tracking key</p>
        <p className="tabular mt-3 break-all font-mono text-2xl font-semibold tracking-wider sm:text-3xl">{trackingKey}</p>
        <p className="mt-3 max-w-md text-sm text-forest/75">
          Keep this safe — together with reference <strong>{orderNumber}</strong> it&apos;s the only way to look up this order. We store only a
          one-way hash of it.
        </p>
      </div>
      <div className="flex flex-wrap gap-3 lg:col-span-6 lg:justify-end">
        <button type="button" onClick={() => copy("key")} className="inline-flex h-11 items-center gap-2 rounded-full bg-forest px-5 text-sm font-medium text-ivory">
          {copied === "key" ? <Check size={16} /> : <Copy size={16} />} {copied === "key" ? "Copied" : "Copy key"}
        </button>
        <button type="button" onClick={() => copy("link")} className="inline-flex h-11 items-center gap-2 rounded-full border border-forest/25 px-5 text-sm font-medium">
          {copied === "link" ? <Check size={16} /> : <Copy size={16} />} {copied === "link" ? "Link copied" : "Copy tracking link"}
        </button>
        <span className="sr-only" aria-live="polite">
          {copied ? "Copied to clipboard" : ""}
        </span>
      </div>
    </div>
  );
}
