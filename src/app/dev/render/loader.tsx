"use client";

import dynamic from "next/dynamic";

export const RenderStudioLoader = dynamic(() => import("@/components/three/render-studio"), { ssr: false });
