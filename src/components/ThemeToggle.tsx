"use client";

import { useEffect, useState } from "react";

export function ThemeToggle({ labels }: { labels: { light: string; dark: string } }) {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "light" || current === "dark") {
      setTheme(current);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
    }
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("aclic-theme", next);
    } catch {
      // Storage unavailable — the toggle still works for this page view.
    }
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isDark}
      className="border border-gold/40 rounded px-3 py-1.5 text-2xs uppercase tracking-[0.12em] hover:border-gold transition-colors duration-150"
    >
      {isDark ? labels.dark : labels.light}
    </button>
  );
}
