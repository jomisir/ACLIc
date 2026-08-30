"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, localeNames, type Locale } from "@/i18n/routing";
import { useParams } from "next/navigation";

export function LanguageSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  return (
    <label className="flex items-center gap-2 text-2xs uppercase tracking-[0.12em]">
      <span className="sr-only">{label}</span>
      <select
        value={locale}
        onChange={(e) => {
          const nextLocale = e.target.value as Locale;
          router.replace(
            // @ts-expect-error dynamic params passthrough is fine here
            { pathname, params },
            { locale: nextLocale },
          );
        }}
        className="bg-transparent border border-gold/40 rounded px-2 py-1.5 hover:border-gold transition-colors duration-150"
      >
        {locales.map((l) => (
          <option key={l} value={l} lang={l}>
            {localeNames[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
