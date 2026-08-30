import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPublishedPageBody } from "@/lib/content";
import { pageMetadata } from "@/lib/metadata";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Privacy" });
  return pageMetadata({ locale, path: "/privacy", title: t("heading"), description: t("metaDescription") });
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Privacy" });
  const tCommon = await getTranslations({ locale, namespace: "Common" });
  const body = await getPublishedPageBody("privacy", locale);

  return (
    <main className="mx-auto max-w-[1180px] px-6 py-16">
      <p className="eyebrow mb-4">{t("eyebrow")}</p>
      <h1 className="text-3xl mb-8 max-w-2xl">{t("heading")}</h1>

      {body?.body ? (
        <div className="measure">
          {body.fellBack && <p className="text-2xs text-muted mb-2">{tCommon("availableInEnglish")}</p>}
          <p className="whitespace-pre-line">{body.body}</p>
        </div>
      ) : (
        <p className="measure text-muted">
          This page covers how ACLIC handles newsletter sign-up data and other personal
          information collected through this site. The full notice will be published here once
          drafted and reviewed.
        </p>
      )}
    </main>
  );
}
