import { ImageResponse } from "next/og";

export const alt = "SniffOrbit ONE — Every playtime, a new discovery.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social sharing card, generated at build time with the brand palette. */
export default function OpenGraphImage() {
  const beads = Array.from({ length: 6 }, (_, i) => {
    const a = ((-90 + i * 60) * Math.PI) / 180;
    return { x: 210 + 150 * Math.cos(a), y: 210 + 150 * Math.sin(a), i };
  });
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0C3438", color: "#F7F3EA", padding: 72, position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 680 }}>
          <div style={{ display: "flex", fontSize: 26, letterSpacing: 6, color: "#B9E5DB", textTransform: "uppercase" }}>SniffOrbit ONE</div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 96, fontWeight: 800, lineHeight: 0.92, letterSpacing: -3 }}>
            <span>PLAYTIME HAS</span>
            <span>A PLOT TWIST.</span>
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "rgba(247,243,234,.75)" }}>Every playtime, a new discovery.</div>
        </div>
        <div style={{ display: "flex", position: "absolute", right: 60, top: 105, width: 420, height: 420 }}>
          <svg width="420" height="420" viewBox="0 0 420 420">
            <circle cx="210" cy="210" r="150" fill="none" stroke="#F7F3EA" strokeWidth="22" />
            <circle cx="210" cy="210" r="34" fill="#F7F3EA" />
            {beads.map((b) => (
              <circle key={b.i} cx={b.x} cy={b.y} r={b.i === 1 ? 40 : 28} fill={b.i === 1 ? "#FF794B" : "#F7F3EA"} />
            ))}
          </svg>
        </div>
      </div>
    ),
    size,
  );
}
