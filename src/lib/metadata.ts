import type { Metadata } from "next";
import { routing, type Locale } from "@/i18n/routing";

/**
 * Per-page metadata with correct hreflang alternates. Without this, every
 * page inherits the root layout's blanket alternates (which point at each
 * locale's homepage), so e.g. /en/leaders would incorrectly claim its
 * Amharic equivalent is /am instead of /am/leaders.
 */
export function pageMetadata({
  locale,
  path,
  title,
  description,
}: {
  locale: Locale;
  path: string; // e.g. "/leaders", or "" for the homepage
  title: string;
  description: string;
}): Metadata {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return {
    title,
    description,
    alternates: {
      canonical: `${base}/${locale}${path}`,
      languages: {
        ...Object.fromEntries(routing.locales.map((l) => [l, `${base}/${l}${path}`])),
        // With localePrefix: "always", x-default should point at the
        // default-locale URL (not an unprefixed root that doesn't actually
        // resolve) — see amannn/next-intl discussion #799.
        "x-default": `${base}/${routing.defaultLocale}${path}`,
      },
    },
    openGraph: {
      title,
      description,
      type: "website",
      locale,
      siteName: "ACLIC",
      url: `${base}/${locale}${path}`,
    },
  };
}
