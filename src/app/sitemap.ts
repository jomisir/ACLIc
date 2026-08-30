import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

const routes = [
  "",
  "/about",
  "/structure",
  "/leaders",
  "/work",
  "/partners",
  "/membership",
  "/resources",
  "/contact",
  "/privacy",
  "/safeguarding",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return routes.map((route) => ({
    url: `${base}/${routing.defaultLocale}${route}`,
    lastModified: new Date(),
    alternates: {
      languages: Object.fromEntries(routing.locales.map((l) => [l, `${base}/${l}${route}`])),
    },
  }));
}
