import { getTranslations } from "next-intl/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { resources } from "@/db/schema";
import type { Locale } from "@/i18n/routing";

const titleCol = { en: "titleEn", am: "titleAm", om: "titleOm" } as const;

export default async function ResourcesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Resources" });

  const rows = await db
    .select()
    .from(resources)
    .where(and(eq(resources.status, "published"), eq(resources.visibility, "public")))
    .orderBy(desc(resources.createdAt));

  return (
    <main className="mx-auto max-w-[1180px] px-6 py-16">
      <p className="eyebrow mb-4">{t("eyebrow")}</p>
      <h1 className="text-3xl mb-12 max-w-2xl">{t("heading")}</h1>

      {rows.length === 0 ? (
        <p className="measure text-muted">{t("emptyState")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.id} className="border border-gold/30 rounded p-4 flex items-center justify-between">
              <span>{r[titleCol[locale]] ?? r.titleEn}</span>
              <a href={`/api/resources/${r.id}`} className="text-sm underline hover:text-gold">
                Download
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
