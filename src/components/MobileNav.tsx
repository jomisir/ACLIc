"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";

export function MobileNav({
  links,
  menuLabel,
  closeLabel,
}: {
  links: { href: string; label: string }[];
  menuLabel: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen((v) => !v)}
        className="border border-gold/40 rounded px-3 py-1.5 text-2xs uppercase tracking-[0.12em]"
      >
        {open ? closeLabel : menuLabel}
      </button>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="absolute left-0 right-0 top-full bg-surface-raised border-b border-gold/30 px-6 py-4">
          <ul className="flex flex-col gap-3">
            {links.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className="block py-1 text-lg hover:text-gold transition-colors duration-150"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
