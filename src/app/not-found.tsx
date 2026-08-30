// Fallback for any request that lands outside the [locale] and admin trees
// (both of which have their own not-found handling). Needs its own
// <html>/<body> since there is no shared root layout in this app.
export default function RootNotFound() {
  return (
    <html lang="en">
      <body style={{ background: "#f7f5f0", color: "#0e0e10", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ maxWidth: 640, margin: "0 auto", padding: "6rem 1.5rem", textAlign: "center" }}>
          <p style={{ textTransform: "uppercase", fontSize: 12, letterSpacing: "0.12em", color: "#5a5e67" }}>404</p>
          <h1 style={{ fontSize: 32, margin: "1rem 0" }}>This page doesn&apos;t exist</h1>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- outside the [locale] tree; next/link's routing context isn't available here */}
          <a href="/en" style={{ color: "#8a6b22" }}>Back to home</a>
        </main>
      </body>
    </html>
  );
}
