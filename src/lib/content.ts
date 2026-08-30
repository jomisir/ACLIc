import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { getSetting } from "@/lib/settings";
import type { Locale } from "@/i18n/routing";

const titleCol = { en: "titleEn", am: "titleAm", om: "titleOm" } as const;
const bodyCol = { en: "bodyEn", am: "bodyAm", om: "bodyOm" } as const;

export async function getPublishedPageBody(slug: string, locale: Locale) {
  const [row] = await db.select().from(pages).where(eq(pages.slug, slug)).limit(1);
  if (!row || row.status !== "published") return null;

  const body = row[bodyCol[locale]] ?? (locale !== "en" ? row.bodyEn : null);
  const fellBack = locale !== "en" && !row[bodyCol[locale]] && !!row.bodyEn;
  const title = row[titleCol[locale]] ?? (locale !== "en" ? row.titleEn : null);

  return body || title ? { title, body, fellBack } : null;
}

export async function getMissionVision(locale: Locale) {
  const [mission, vision] = await Promise.all([
    getSetting("mission_statement", locale),
    getSetting("vision_statement", locale),
  ]);
  return { mission, vision };
}
