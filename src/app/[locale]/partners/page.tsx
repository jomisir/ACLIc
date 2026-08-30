import { getTranslations } from "next-intl/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { partners } from "@/db/schema";
import type { Locale } from "@/i18n/routing";

export default async function PartnersPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Partners" });

  const rows = await db
    .select()
    .from(partners)
    .where(eq(partners.status, "published"))
    .orderBy(asc(partners.displayOrder));

  const parents = rows.filter((p) => p.isParentOrg);
  const others = rows.filter((p) => !p.isParentOrg);

  return (
    <main className="mx-auto max-w-[1180px] px-6 py-16">
      <p className="eyebrow mb-4">{t("eyebrow")}</p>
      <h1 className="text-3xl mb-12 max-w-2xl">{t("heading")}</h1>

      <section className="mb-16">
        <h2 className="eyebrow mb-6">{t("parentHeading")}</h2>
        <ul className="flex flex-wrap gap-8">
          {parents.map((p) => (
            <li key={p.id} className="border border-gold/30 rounded p-6 w-56 flex flex-col items-center justify-center gap-3">
              {p.logoPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/partners/${p.id}/logo`} alt={p.name ?? ""} className="max-h-16 object-contain" />
              ) : (
                <span className="font-display text-lg text-center">{p.name}</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {others.length > 0 && (
        <section>
          <h2 className="eyebrow mb-6">{t("otherHeading")}</h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {others.map((p) => (
              <li key={p.id} className="border border-gold/30 rounded p-6 flex items-center justify-center h-24">
                {p.logoPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/partners/${p.id}/logo`} alt={p.name ?? ""} className="max-h-full object-contain" />
                ) : (
                  <span className="text-sm text-center">{p.name}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
