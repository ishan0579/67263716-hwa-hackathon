import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · SniffOrbit Admin" },
  robots: { index: false, follow: false },
};

/** Shared wrapper for every /admin route (incl. login): toasts and motion config. */
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <Providers>{children}</Providers>;
}
