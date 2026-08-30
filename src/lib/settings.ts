import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import type { Locale } from "@/i18n/routing";

const localeColumn = {
  en: "valueEn",
  am: "valueAm",
  om: "valueOm",
} as const;

/** Reads one settings row, falling back to English when the requested locale is empty. */
export async function getSetting(
  key: string,
  locale: Locale = "en",
): Promise<{ value: string | null; fellBackToEnglish: boolean }> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  if (!row) return { value: null, fellBackToEnglish: false };

  const col = localeColumn[locale];
  const localized = row[col];
  if (localized) return { value: localized, fellBackToEnglish: false };

  return { value: row.valueEn, fellBackToEnglish: locale !== "en" && !!row.valueEn };
}

export async function getAllSettings() {
  return db.select().from(settings);
}
