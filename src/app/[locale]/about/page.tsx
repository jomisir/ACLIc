import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ImageSlot } from "@/components/ImageSlot";
import { getMissionVision, getPublishedPageBody } from "@/lib/content";
import { pageMetadata } from "@/lib/metadata";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "About" });
  return pageMetadata({ locale, path: "/about", title: t("heading"), description: t("metaDescription") });
}

export default async function AboutPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "About" });
  const tHome = await getTranslations({ locale, namespace: "Home" });
  const tCommon = await getTranslations({ locale, namespace: "Common" });
  const { mission, vision } = await getMissionVision(locale);
  const body = await getPublishedPageBody("about", locale);

  return (
    <main className="mx-auto max-w-[1180px] px-6 py-16">
      <p className="eyebrow mb-4">{t("eyebrow")}</p>
      <h1 className="text-3xl mb-10 max-w-2xl">{t("heading")}</h1>

      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <section className="md:col-span-2">
          <h2 className="text-xl mb-3">{t("foundingHeading")}</h2>
          <p className="measure text-muted mb-6">{t("foundingBody")}</p>

          <h2 className="text-xl mb-3">{t("growthHeading")}</h2>
          <p className="measure text-muted mb-6">{t("growthBody")}</p>

          <h2 className="text-xl mb-3">{t("unHeading")}</h2>
          <p className="measure text-muted">{t("unBody")}</p>

          {body?.body && (
            <div className="measure mt-8 pt-8 border-t border-gold/20">
              {body.fellBack && <p className="text-2xs text-muted mb-2">{tCommon("availableInEnglish")}</p>}
              <p className="whitespace-pre-line">{body.body}</p>
            </div>
          )}
        </section>
        <aside className="flex flex-col gap-4">
          <ImageSlot pageSlug="about" slotKey="about-1" locale={locale} />
          <ImageSlot pageSlug="about" slotKey="about-2" locale={locale} />
          <ImageSlot pageSlug="about" slotKey="about-3" locale={locale} />
        </aside>
      </div>

      <div className="grid md:grid-cols-2 gap-8 pt-8 border-t border-gold/20">
        <div>
          <h2 className="text-xl mb-2">{t("missionHeading")}</h2>
          <p className="measure text-muted">{mission.value ?? tHome("missionEmpty")}</p>
        </div>
        <div>
          <h2 className="text-xl mb-2">{t("visionHeading")}</h2>
          <p className="measure text-muted">{vision.value ?? tHome("visionEmpty")}</p>
        </div>
      </div>
    </main>
  );
}
