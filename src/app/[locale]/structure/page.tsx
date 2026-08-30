import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StructureDiagram } from "@/components/StructureDiagram";
import { ImageSlot } from "@/components/ImageSlot";
import { pageMetadata } from "@/lib/metadata";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Structure" });
  return pageMetadata({ locale, path: "/structure", title: t("heading"), description: t("metaDescription") });
}

export default async function StructurePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Structure" });

  return (
    <main className="mx-auto max-w-[1180px] px-6 py-16">
      <p className="eyebrow mb-4">{t("eyebrow")}</p>
      <h1 className="text-3xl mb-10 max-w-2xl">{t("heading")}</h1>

      <StructureDiagram variant="full" locale={locale} />

      <div className="grid md:grid-cols-2 gap-8 mt-16">
        <section>
          <h2 className="text-xl mb-3">{t("assemblyHeading")}</h2>
          <p className="measure text-muted">{t("assemblyBody")}</p>
        </section>
        <section>
          <h2 className="text-xl mb-3">{t("leadershipHeading")}</h2>
          <p className="measure text-muted mb-2">{t("leadershipBody")}</p>
          <p className="measure text-sm text-gold-deep dark:text-gold">{t("ageNote")}</p>
        </section>
      </div>

      <div className="mt-12">
        <ImageSlot pageSlug="structure" slotKey="structure-1" locale={locale} />
      </div>

      <div className="grid md:grid-cols-2 gap-8 mt-16 pt-8 border-t border-gold/20">
        <section>
          <h2 className="text-xl mb-3">{t("hostHeading")}</h2>
          <p className="measure text-muted">{t("hostBody")}</p>
        </section>
        <section>
          <h2 className="text-xl mb-3">{t("bylawsHeading")}</h2>
          <p className="measure text-muted">{t("bylawsNote")}</p>
        </section>
      </div>
    </main>
  );
}
