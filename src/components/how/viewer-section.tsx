"use client";

import dynamic from "next/dynamic";

const ProductViewer = dynamic(() => import("../three/product-viewer"), {
  ssr: false,
  loading: () => <div className="grid size-full place-items-center text-sm text-graphite/50">Loading 3D view…</div>,
});

export function HowViewer() {
  return (
    <div className="h-[70svh] min-h-[460px] rounded-[var(--radius-panel)] bg-sand/60 p-3 sm:p-4">
      <ProductViewer colorKey="deep-woods" colorHex="#124147" accentHex="#B9E5DB" className="h-full" />
    </div>
  );
}
