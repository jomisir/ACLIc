"use client";

import { useState, type ReactNode } from "react";

const tabs = [
  { key: "en", label: "English" },
  { key: "am", label: "Amharic" },
  { key: "om", label: "Afaan Oromoo" },
] as const;

/**
 * Shows one locale's fields at a time while keeping all three mounted, so a
 * plain <form> submits every field regardless of which tab is active.
 */
export function LocaleTabs({ en, am, om }: { en: ReactNode; am: ReactNode; om: ReactNode }) {
  const [active, setActive] = useState<(typeof tabs)[number]["key"]>("en");
  const content = { en, am, om };

  return (
    <div className="border border-[#c8a24a]/30 rounded">
      <div role="tablist" className="flex border-b border-[#c8a24a]/30">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => setActive(tab.key)}
            className={`px-4 py-2 text-sm ${active === tab.key ? "bg-[#c8a24a]/10 font-medium" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-4">
        {tabs.map((tab) => (
          <div key={tab.key} hidden={active !== tab.key}>
            {content[tab.key]}
          </div>
        ))}
      </div>
    </div>
  );
}
