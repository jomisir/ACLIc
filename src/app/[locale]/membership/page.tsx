import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ImageSlot } from "@/components/ImageSlot";
import { getSetting } from "@/lib/settings";
import { pageMetadata } from "@/lib/metadata";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Membership" });
  return pageMetadata({ locale, path: "/membership", title: t("heading"), description: t("metaDescription") });
}

export default async function MembershipPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Membership" });
  const formUrl = await getSetting("membership_form_url", locale);

  return (
    <main className="mx-auto max-w-[1180px] px-6 py-16">
      <p className="eyebrow mb-4">{t("eyebrow")}</p>
      <h1 className="text-3xl mb-12 max-w-2xl">{t("heading")}</h1>

      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <div className="md:col-span-2 flex flex-col gap-8">
          <section>
            <h2 className="text-xl mb-2">{t("whoHeading")}</h2>
            <p className="measure text-muted">{t("whoBody")}</p>
          </section>
          <section>
            <h2 className="text-xl mb-2">{t("involvesHeading")}</h2>
            <p className="measure text-muted">{t("involvesBody")}</p>
          </section>
        </div>
        <ImageSlot pageSlug="membership" slotKey="membership-1" locale={locale} />
      </div>

      <div className="pt-8 border-t border-gold/20">
        {formUrl.value ? (
          <a
            href={formUrl.value}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-block bg-ink text-surface px-6 py-3 rounded hover:opacity-90 transition-opacity"
          >
            {t("applyCta")}
          </a>
        ) : (
          <p className="text-sm text-muted">The membership application link has not been configured yet.</p>
        )}
        <p className="text-2xs text-muted mt-2">{t("applyNote")}</p>
      </div>
    </main>
  );
}
