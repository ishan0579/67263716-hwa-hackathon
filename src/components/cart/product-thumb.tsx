import { cn, cosR, sinR } from "@/lib/utils";

/**
 * Lightweight vector thumbnail of SniffOrbit ONE in a given colourway
 * (three-quarter top view). Used in the cart, checkout and admin where
 * spinning up WebGL would be wasteful.
 */
export function ProductThumb({
  colorHex,
  accentHex,
  className,
  title,
}: {
  colorHex: string;
  accentHex: string;
  className?: string;
  title?: string;
}) {
  const chambers = Array.from({ length: 6 }, (_, i) => {
    const a = ((-90 + i * 60 + 30) * Math.PI) / 180;
    return { x: 60 + 27 * cosR(a), y: 54 + 15 * sinR(a), i };
  });
  return (
    <svg viewBox="0 0 120 100" className={cn("block", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <ellipse cx="60" cy="80" rx="46" ry="9" fill="#0C3438" opacity=".14" />
      <path d="M14 56 v10 a46 22 0 0 0 92 0 v-10" fill="#20262C" />
      <path d="M14 52 v10 a46 22 0 0 0 92 0 v-10" fill={colorHex} />
      <path d="M14 52 v10 a46 22 0 0 0 92 0 v-10" fill="#000" opacity=".12" />
      <ellipse cx="60" cy="52" rx="46" ry="22" fill={colorHex} />
      <ellipse cx="60" cy="52" rx="46" ry="22" fill="url(#thumb-sheen)" />
      {chambers.map((c) =>
        c.i === 0 ? null : <circle key={c.i} cx={c.x} cy={c.y} r="2" fill="#0C3438" opacity=".35" />,
      )}
      <path d="M60 52 L95 41 A46 22 0 0 1 104 56 Z" fill={accentHex} />
      <path d="M60 52 L95 41 A46 22 0 0 1 104 56 Z" fill="#000" opacity=".06" />
      <ellipse cx="60" cy="52" rx="9" ry="4.6" fill={accentHex} />
      <ellipse cx="60" cy="51" rx="6" ry="3" fill="#fff" opacity=".35" />
      <defs>
        <linearGradient id="thumb-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".35" />
          <stop offset=".6" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
