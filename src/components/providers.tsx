"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { CartUIProvider } from "./cart/cart-ui";
import { ToastProvider } from "./ui/toast";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ ease: [0.16, 1, 0.3, 1] }}>
      <ToastProvider>
        <CartUIProvider>{children}</CartUIProvider>
      </ToastProvider>
    </MotionConfig>
  );
}
