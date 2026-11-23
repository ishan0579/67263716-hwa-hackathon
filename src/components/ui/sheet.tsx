"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Accessible modal sheet built on the native <dialog> element:
 * focus is trapped and restored by the browser, Escape closes it, the page
 * behind becomes inert, and a click on the backdrop dismisses it.
 */
export function Sheet({
  open,
  onClose,
  side = "right",
  label,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  side?: "right" | "full" | "center";
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      document.documentElement.style.overflow = "hidden";
    } else if (!open && d.open) {
      d.close();
    }
    if (!open) document.documentElement.style.overflow = "";
  }, [open]);

  useEffect(
    () => () => {
      document.documentElement.style.overflow = "";
    },
    [],
  );

  const panel =
    side === "right"
      ? "ml-auto h-dvh w-full max-w-[30rem] translate-x-0 transition-transform duration-500 ease-[var(--ease-out-expo)] starting:translate-x-full"
      : side === "full"
        ? "h-dvh w-full transition-[opacity,clip-path] duration-500 ease-[var(--ease-out-expo)] [clip-path:inset(0_0_0_0)] starting:[clip-path:inset(0_0_100%_0)]"
        : "m-auto w-[min(92vw,34rem)] rounded-[var(--radius-panel)] transition-[opacity,transform] duration-300 starting:scale-95 starting:opacity-0";

  return (
    <dialog
      ref={ref}
      aria-label={label}
      // `open:` keeps the native `dialog:not([open]) { display: none }` intact while closed.
      className={cn("sheet inset-0 h-dvh w-full", side === "center" && "open:grid open:place-items-center bg-transparent")}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {open && <div className={cn(panel, className)}>{children}</div>}
    </dialog>
  );
}
