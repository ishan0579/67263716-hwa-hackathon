/** Joins class names, skipping falsy values. */
export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function formatDate(d: Date | string, withTime = false) {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
  }).format(date);
}

/**
 * Trig rounded to 6 decimals. Server (Node) and browser V8 builds can differ in
 * the last digit of Math.sin/cos, which causes SVG hydration mismatches.
 */
export const cosR = (a: number) => Math.round(Math.cos(a) * 1e6) / 1e6;
export const sinR = (a: number) => Math.round(Math.sin(a) * 1e6) / 1e6;
