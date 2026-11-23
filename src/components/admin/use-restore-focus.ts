"use client";

import { useEffect, useState } from "react";

/**
 * Remembers the element that had focus when the calling component first
 * rendered and returns focus to it on unmount. Used for modals that unmount
 * instead of calling dialog.close() (which would normally restore focus).
 *
 * The element is captured during the first render — before the Sheet's effect
 * calls showModal() — and kept in state, so StrictMode's dev-only effect
 * re-run can't overwrite it with an element inside the dialog.
 */
export function useRestoreFocus() {
  const [previous] = useState<HTMLElement | null>(() =>
    typeof document !== "undefined" && document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );
  useEffect(
    () => () => {
      requestAnimationFrame(() => {
        if (previous && previous.isConnected) previous.focus();
      });
    },
    [previous],
  );
}
