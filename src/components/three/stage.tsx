"use client";

import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { Canvas, type CanvasProps } from "@react-three/fiber";
import { Component, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils";

let webglSupport: boolean | undefined;
export function detectWebGL() {
  if (typeof window === "undefined") return false;
  if (webglSupport !== undefined) return webglSupport;
  try {
    const c = document.createElement("canvas");
    webglSupport = Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

/** "low" on small or low-memory devices; drives geometry detail, DPR and shadows. */
export function detectQuality(): "high" | "low" {
  if (typeof window === "undefined") return "high";
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const small = window.matchMedia("(max-width: 767px)").matches;
  const cores = navigator.hardwareConcurrency ?? 8;
  return small || mem <= 4 || cores <= 4 ? "low" : "high";
}

const noopSubscribe = () => () => {};

/** Rendering quality tier for this device ("high" during SSR). */
export function useQuality() {
  return useSyncExternalStore(noopSubscribe, detectQuality, () => "high" as const);
}

/** WebGL availability: null during SSR/hydration, then true/false. */
function useWebGLSupport() {
  return useSyncExternalStore<boolean | null>(noopSubscribe, detectWebGL, () => null);
}

export { usePrefersReducedMotion } from "@/hooks/use-client";

class WebGLBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn("[3d] WebGL scene failed, showing fallback image.", err);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Soft studio lighting built from local light-formers (no HDR downloads). */
export function StudioLights({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <>
      <ambientLight intensity={tone === "dark" ? 0.25 : 0.4} />
      <hemisphereLight args={["#fff9f0", "#0c3438", tone === "dark" ? 0.55 : 0.7]} />
      <directionalLight position={[3.5, 6, 4]} intensity={tone === "dark" ? 1.9 : 1.6} color="#fff6ea" />
      <directionalLight position={[-4, 2.5, -3]} intensity={0.6} color="#b9e5db" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[8, 8, 1]} />
        <Lightformer form="rect" intensity={1.4} position={[-6, 2, 2]} rotation={[0, Math.PI / 2, 0]} scale={[6, 2.5, 1]} />
        <Lightformer form="rect" intensity={0.9} position={[6, 1.5, 1]} rotation={[0, -Math.PI / 2, 0]} scale={[6, 2, 1]} color="#b9e5db" />
        <Lightformer form="ring" intensity={0.8} position={[0, 2, 7]} scale={3} color="#ffd6c4" />
        <Lightformer form="rect" intensity={0.5} position={[0, -3, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[10, 10, 1]} color="#0c3438" />
      </Environment>
    </>
  );
}

export function GroundShadow({ quality, opacity = 0.42 }: { quality: "high" | "low"; opacity?: number }) {
  return (
    <ContactShadows
      position={[0, -0.002, 0]}
      opacity={opacity}
      scale={7}
      blur={2.4}
      far={2.4}
      resolution={quality === "high" ? 512 : 256}
      color="#061a1c"
      frames={quality === "high" ? Infinity : 1}
    />
  );
}

/**
 * Canvas wrapper: WebGL detection, error boundary with image fallback, quality
 * tiers, and pausing the render loop while the canvas is off-screen.
 */
export function Stage({
  children,
  fallback,
  className,
  camera,
  quality,
  label,
  onReady,
  onCreated,
  ...rest
}: {
  children: ReactNode;
  fallback: ReactNode;
  className?: string;
  camera?: CanvasProps["camera"];
  quality: "high" | "low";
  label: string;
  onReady?: () => void;
} & Omit<CanvasProps, "children" | "camera">) {
  const supported = useWebGLSupport();
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e!.isIntersecting), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={wrap}
      // Callers may position the stage themselves (e.g. `absolute inset-0`); only default to relative.
      className={cn(/\b(absolute|fixed|sticky)\b/.test(className ?? "") ? "" : "relative", className)}
      role="img"
      aria-label={label}
    >
      {/* Fallback image sits underneath until the scene has rendered — no layout shift. */}
      <div className={cn("absolute inset-0 transition-opacity duration-700", ready && supported ? "opacity-0" : "opacity-100")} aria-hidden="true">
        {fallback}
      </div>
      {supported && (
        <WebGLBoundary fallback={null}>
          <Canvas
            className={cn("!absolute inset-0 transition-opacity duration-700", ready ? "opacity-100" : "opacity-0")}
            dpr={quality === "high" ? [1, 1.8] : [1, 1.3]}
            frameloop={visible ? "always" : "never"}
            camera={{ fov: 28, near: 0.1, far: 60, position: [0, 2.4, 6.4], ...(camera as object) }}
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: "high-performance",
              // Automated browsers (screenshots/E2E) need the buffer preserved to capture frames.
              preserveDrawingBuffer: typeof navigator !== "undefined" && navigator.webdriver === true,
            }}
            onCreated={(state) => {
              const { gl } = state;
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.toneMappingExposure = 1.05;
              gl.outputColorSpace = THREE.SRGBColorSpace;
              onCreated?.(state);
              requestAnimationFrame(() => {
                setReady(true);
                onReady?.();
              });
            }}
            {...rest}
          >
            {children}
          </Canvas>
        </WebGLBoundary>
      )}
    </div>
  );
}
