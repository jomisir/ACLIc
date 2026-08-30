import { getTranslations } from "next-intl/server";
import { getPublishedPageBody } from "@/lib/content";
import type { Locale } from "@/i18n/routing";

export default async function SafeguardingPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Safeguarding" });
  const tCommon = await getTranslations({ locale, namespace: "Common" });
  const body = await getPublishedPageBody("safeguarding", locale);

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
          ACLIC&apos;s leadership are all under eighteen. This statement will set out how the
          coalition protects them — consistent with the safeguarding policies of its parent
          organizations, OSD and Save the Children — once drafted and reviewed.
        </p>
      )}
    </main>
  );
}
