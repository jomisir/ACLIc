"use client";

// Root-level error boundary — must render its own <html>/<body> because it
// replaces the entire layout tree, including [locale]/layout.tsx, when an
// error escapes React's render.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#f7f5f0", color: "#0e0e10", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ maxWidth: 640, margin: "0 auto", padding: "6rem 1.5rem", textAlign: "center" }}>
          <p style={{ textTransform: "uppercase", fontSize: 12, letterSpacing: "0.12em", color: "#5a5e67" }}>500</p>
          <h1 style={{ fontSize: 32, margin: "1rem 0" }}>Something went wrong on our end</h1>
          <p style={{ color: "#5a5e67", marginBottom: "2rem" }}>
            Try again in a moment. If this keeps happening, let us know through the contact page.
          </p>
          <button
            onClick={reset}
            style={{ border: "1px solid #c8a24a", color: "#8a6b22", padding: "0.6rem 1.4rem", borderRadius: 4, background: "none", cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
