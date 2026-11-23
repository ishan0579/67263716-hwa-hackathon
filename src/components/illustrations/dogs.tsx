/**
 * Original flat illustrations in the SniffOrbit palette. Decorative unless a
 * `title` is supplied. Shapes are deliberately simple and geometric.
 */
import { cn, cosR, sinR } from "@/lib/utils";

type P = { className?: string; title?: string };

function Frame({ className, title, children, bg }: P & { children: React.ReactNode; bg: string }) {
  return (
    <svg
      viewBox="0 0 400 400"
      className={cn("block", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title && <title>{title}</title>}
      <rect width="400" height="400" fill={bg} />
      {children}
    </svg>
  );
}

/** A dog in profile following scent trails rising from the toy. */
export function SniffingDog({ className, title }: P) {
  return (
    <Frame className={className} title={title} bg="#E5F8F5">
      <circle cx="210" cy="210" r="150" fill="#B9E5DB" />
      {/* scent trails */}
      <g fill="none" stroke="#FF794B" strokeWidth="5" strokeLinecap="round" strokeDasharray="1 14">
        <path d="M330 330 C 360 290, 330 260, 352 222" />
        <path d="M300 336 C 320 300, 300 270, 330 236" />
        <path d="M360 326 C 392 296, 372 262, 378 232" />
      </g>
      {/* toy */}
      <ellipse cx="332" cy="352" rx="62" ry="16" fill="#0C3438" opacity=".18" />
      <path d="M272 336 v10 a60 15 0 0 0 120 0 v-10" fill="#20262C" />
      <ellipse cx="332" cy="334" rx="60" ry="15" fill="#F1EBDD" />
      <path d="M332 334 L376 327 A60 15 0 0 1 390 336 Z" fill="#FF794B" />
      {/* neck + body */}
      <path d="M70 400 C 70 320, 110 270, 160 262 L 250 300 C 262 340, 250 380, 240 400 Z" fill="#91B7A6" />
      {/* head */}
      <path
        d="M128 268 C 112 214, 136 150, 196 136 C 236 127, 268 140, 284 166 C 298 186, 326 188, 348 196 C 368 203, 372 226, 354 234 C 334 243, 300 240, 282 246 C 262 254, 252 280, 240 300 C 222 326, 176 330, 150 312 C 138 302, 132 288, 128 268 Z"
        fill="#F7F3EA"
      />
      {/* muzzle shade */}
      <path d="M282 246 C 300 240, 334 243, 354 234 C 352 246, 330 256, 300 258 C 290 258, 284 254, 282 246 Z" fill="#E7DFCF" />
      {/* ear */}
      <path d="M204 142 C 168 146, 150 200, 166 254 C 174 278, 202 274, 208 250 C 214 214, 224 172, 204 142 Z" fill="#0C3438" />
      {/* eye + brow */}
      <circle cx="270" cy="182" r="7" fill="#20262C" />
      <circle cx="272.5" cy="179.5" r="2" fill="#fff" />
      <path d="M256 166 q12 -8 26 -2" stroke="#20262C" strokeWidth="4" strokeLinecap="round" fill="none" />
      {/* nose */}
      <path d="M346 200 c 10 -4 22 2 22 14 c 0 9 -9 13 -16 12 c -9 -1 -14 -8 -14 -14 c 0 -6 3 -10 8 -12 Z" fill="#20262C" />
      {/* mouth */}
      <path d="M306 246 C 318 248, 330 244, 340 238" stroke="#20262C" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      {/* collar */}
      <path d="M140 300 C 176 324, 220 322, 248 300" stroke="#FF794B" strokeWidth="16" strokeLinecap="round" fill="none" />
      <circle cx="196" cy="326" r="10" fill="#F7F3EA" stroke="#0C3438" strokeWidth="3" />
    </Frame>
  );
}

/** A paw nudging the shutter, seen from above. */
export function PawOnShutter({ className, title }: P) {
  return (
    <Frame className={className} title={title} bg="#0C3438">
      <circle cx="200" cy="200" r="168" fill="#134a4f" />
      <circle cx="200" cy="214" r="150" fill="#20262C" />
      <circle cx="200" cy="200" r="146" fill="#F1EBDD" />
      {[60, 120, 180, 240, 300].map((d) => {
        const a = ((d - 90) * Math.PI) / 180;
        return [-9, 0, 9].map((o) => {
          const b = (((d + o) - 90) * Math.PI) / 180;
          return <circle key={`${d}${o}`} cx={200 + 98 * cosR(b)} cy={200 + 98 * sinR(b)} r="4.5" fill="#0C3438" opacity={a ? 0.3 : 0.3} />;
        });
      })}
      <path d="M200 200 L 136 86 A 130 130 0 0 1 264 86 Z" fill="#FF794B" transform="rotate(28 200 200)" />
      <circle cx="200" cy="200" r="28" fill="#FF794B" />
      {/* motion lines */}
      <g stroke="#B9E5DB" strokeWidth="5" strokeLinecap="round">
        <path d="M300 66 l 22 -14" />
        <path d="M318 96 l 26 -6" />
        <path d="M282 46 l 12 -20" />
      </g>
      {/* paw */}
      <g transform="translate(262 98) rotate(28)">
        <path d="M-40 18 C -44 -14, -18 -30, 0 -30 C 18 -30, 44 -14, 40 18 C 36 40, 14 42, 0 36 C -14 42, -36 40, -40 18 Z" fill="#7a4a2a" />
        <ellipse cx="-44" cy="-36" rx="12" ry="16" fill="#7a4a2a" transform="rotate(-22 -44 -36)" />
        <ellipse cx="-16" cy="-58" rx="12" ry="16" fill="#7a4a2a" transform="rotate(-8 -16 -58)" />
        <ellipse cx="16" cy="-58" rx="12" ry="16" fill="#7a4a2a" transform="rotate(8 16 -58)" />
        <ellipse cx="44" cy="-36" rx="12" ry="16" fill="#7a4a2a" transform="rotate(22 44 -36)" />
        <path d="M-24 6 C -24 -8, -10 -16, 0 -16 C 10 -16, 24 -8, 24 6 C 22 18, 10 20, 0 16 C -10 20, -22 18, -24 6 Z" fill="#c98a6a" />
      </g>
    </Frame>
  );
}

/** A big friendly nose meeting a piece of kibble — connection at mealtime. */
export function NoseAndKibble({ className, title }: P) {
  return (
    <Frame className={className} title={title} bg="#FF794B">
      <circle cx="200" cy="200" r="160" fill="#FFD6C4" opacity=".45" />
      {/* snout */}
      <path d="M-20 120 C 120 110, 250 130, 300 190 C 330 226, 320 280, 270 300 C 200 326, 80 320, -20 300 Z" fill="#F7F3EA" />
      <path d="M-20 260 C 80 280, 200 290, 268 296 C 230 318, 90 322, -20 306 Z" fill="#E7DFCF" />
      {/* nose */}
      <path d="M228 168 C 262 150, 318 158, 326 196 C 332 226, 306 244, 278 246 C 250 248, 222 236, 216 210 C 212 192, 214 176, 228 168 Z" fill="#20262C" />
      <path d="M244 206 c 6 -10 18 -10 22 0 c -4 8 -16 10 -22 0 Z" fill="#000" opacity=".6" />
      <path d="M284 204 c 6 -10 18 -10 22 0 c -4 8 -16 10 -22 0 Z" fill="#000" opacity=".6" />
      <path d="M244 176 c 14 -8 34 -8 48 -2" stroke="#fff" strokeOpacity=".35" strokeWidth="6" strokeLinecap="round" fill="none" />
      {/* hand with kibble */}
      <path d="M420 330 C 380 320, 350 300, 340 284 C 334 274, 344 266, 356 270 L 420 286 Z" fill="#0C3438" />
      <ellipse cx="350" cy="262" rx="14" ry="10" fill="#A0612F" transform="rotate(-18 350 262)" />
      {/* sparkle */}
      <g fill="#0C3438">
        <path d="M352 222 l4 -14 l4 14 l14 4 l-14 4 l-4 14 l-4 -14 l-14 -4 Z" />
      </g>
    </Frame>
  );
}
