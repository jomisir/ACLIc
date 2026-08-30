import { getTranslations } from "next-intl/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { workItems, workCategoryEnum } from "@/db/schema";
import { ImageSlot } from "@/components/ImageSlot";
import type { Locale } from "@/i18n/routing";

const titleCol = { en: "titleEn", am: "titleAm", om: "titleOm" } as const;
const summaryCol = { en: "summaryEn", am: "summaryAm", om: "summaryOm" } as const;

export default async function WorkPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Work" });

  const categories = workCategoryEnum.enumValues;
  const itemsByCategory = Object.fromEntries(
    await Promise.all(
      categories.map(async (cat) => [
        cat,
        await db
          .select()
          .from(workItems)
          .where(and(eq(workItems.category, cat), eq(workItems.status, "published"), eq(workItems.visibility, "public")))
          .orderBy(asc(workItems.occurredOn)),
      ]),
    ),
  );

  return (
    <main className="mx-auto max-w-[1180px] px-6 py-16">
      <p className="eyebrow mb-4">{t("eyebrow")}</p>
      <h1 className="text-3xl mb-12 max-w-2xl">{t("heading")}</h1>

      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {[0, 1, 2, 3].map((i) => (
          <ImageSlot key={i} pageSlug="work" slotKey={`work-${i + 1}`} locale={locale} />
        ))}
      </div>

      <div className="flex flex-col gap-12">
        {categories.map((cat) => {
          const items = itemsByCategory[cat] as (typeof workItems.$inferSelect)[];
          return (
            <section key={cat} className="pt-8 border-t border-gold/20 first:border-t-0 first:pt-0">
              <h2 className="text-xl mb-4">{t(`categories.${cat}`)}</h2>
              {items.length === 0 ? (
                <p className="text-sm text-muted">{t("emptyState")}</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {items.map((item) => (
                    <li key={item.id} className="border-l-2 border-gold/40 pl-4">
                      <p className="font-medium">{item[titleCol[locale]] ?? item.titleEn}</p>
                      {(item[summaryCol[locale]] ?? item.summaryEn) && (
                        <p className="text-sm text-muted">{item[summaryCol[locale]] ?? item.summaryEn}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
