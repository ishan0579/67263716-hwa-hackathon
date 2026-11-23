"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#0C3438", color: "#F7F3EA", display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <main style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 40, margin: 0 }}>Something went wrong.</h1>
          <p style={{ opacity: 0.75 }}>Please try again in a moment.</p>
          <button
            onClick={reset}
            style={{ marginTop: 16, background: "#FF794B", color: "#0C3438", border: 0, borderRadius: 999, padding: "12px 22px", fontSize: 16, cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
