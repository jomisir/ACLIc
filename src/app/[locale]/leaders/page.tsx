import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { leaders } from "@/db/schema";
import { pageMetadata } from "@/lib/metadata";
import { RichText } from "@/components/RichText";
import type { Locale } from "@/i18n/routing";

const titleCol = { en: "roleTitleEn", am: "roleTitleAm", om: "roleTitleOm" } as const;
const bioCol = { en: "bioEn", am: "bioAm", om: "bioOm" } as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Leaders" });
  return pageMetadata({ locale, path: "/leaders", title: t("heading"), description: t("sub") });
}

export default async function LeadersPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Leaders" });
  const tCommon = await getTranslations({ locale, namespace: "Common" });

  const rows = await db
    .select()
    .from(leaders)
    .where(eq(leaders.status, "published"))
    .orderBy(asc(leaders.displayOrder));

  return (
    <main className="mx-auto max-w-[1180px] px-6 py-16">
      <p className="eyebrow mb-4">{t("eyebrow")}</p>
      <h1 className="text-3xl mb-3 max-w-2xl">{t("heading")}</h1>
      <p className="measure text-muted mb-12">{t("sub")}</p>

      {rows.length === 0 ? (
        <p className="text-muted">{t("profilePending")}</p>
      ) : (
        <ul className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {rows.map((l) => {
            const role = l[titleCol[locale]] ?? l.roleTitleEn;
            const bio = l[bioCol[locale]] ?? l.bioEn;
            const fellBack = locale !== "en" && !l[bioCol[locale]] && !!l.bioEn;

            return (
              <li key={l.id}>
                <details className="border border-gold/30 rounded p-4 group">
                  <summary className="cursor-pointer list-none flex flex-col items-center text-center gap-3">
                    <span className="w-24 h-24 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center font-display text-2xl">
                      {l.photoPath ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/api/leaders/${l.id}/photo`} alt={l.fullName} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        initials(l.fullName)
                      )}
                    </span>
                    <span>
                      <span className="block font-display text-lg">{l.fullName}</span>
                      <span className="block text-2xs uppercase tracking-wide text-muted">{role}</span>
                    </span>
                  </summary>
                  <div className="mt-4 pt-4 border-t border-gold/20 text-sm text-muted text-left">
                    {fellBack && <p className="text-2xs mb-2">{tCommon("availableInEnglish")}</p>}
                    <p className="font-medium text-ink mb-1">{t("bioHeading")}</p>
                    {bio ? <RichText html={bio} /> : <p>—</p>}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}
