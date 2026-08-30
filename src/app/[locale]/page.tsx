import { getTranslations } from "next-intl/server";
import { asc, eq } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import { StructureDiagram } from "@/components/StructureDiagram";
import { ImageSlot } from "@/components/ImageSlot";
import { NewsletterForm } from "@/components/NewsletterForm";
import { getMissionVision } from "@/lib/content";
import { db } from "@/db";
import { partners, workItems } from "@/db/schema";
import { sql } from "drizzle-orm";
import type { Locale } from "@/i18n/routing";

const IMPACT_CATEGORIES = ["training", "campaign", "assembly", "advocacy"] as const;

function OrganizationJsonLd() {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NGO",
    name: "Addis Child-Led Initiatives Coalition",
    alternateName: "ACLIC",
    url: base,
    foundingDate: "2025-08",
    areaServed: "Ethiopia",
    parentOrganization: [
      { "@type": "NGO", name: "Organization for Social Development (OSD)" },
      { "@type": "NGO", name: "Save the Children" },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />;
}

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Home" });
  const tWork = await getTranslations({ locale, namespace: "Work" });
  const tNewsletter = await getTranslations({ locale, namespace: "Newsletter" });
  const { mission, vision } = await getMissionVision(locale);

  const counts = await db
    .select({ category: workItems.category, count: sql<number>`count(*)::int` })
    .from(workItems)
    .where(eq(workItems.status, "published"))
    .groupBy(workItems.category);
  const countByCategory = Object.fromEntries(counts.map((c) => [c.category, c.count]));

  const partnerRows = await db
    .select()
    .from(partners)
    .where(eq(partners.status, "published"))
    .orderBy(asc(partners.displayOrder));

  return (
    <main>
      <OrganizationJsonLd />
      <section className="mx-auto max-w-[1180px] px-6 pt-16 pb-12">
        <p className="eyebrow mb-4">{t("eyebrow")}</p>
        <h1 className="text-4xl max-w-3xl mb-6">{t("heroThesis")}</h1>
        <p className="measure text-lg text-muted mb-10">{t("heroSub")}</p>
        <Link href="/structure" className="inline-block border border-gold text-gold-deep dark:text-gold px-5 py-2.5 rounded hover:bg-gold/10 transition-colors duration-150">
          {t("structureCta")}
        </Link>
      </section>

      <section className="mx-auto max-w-[1180px] px-6 py-12 border-t border-gold/20">
        <StructureDiagram variant="compact" locale={locale} />
      </section>

      <section className="mx-auto max-w-[1180px] px-6 py-12 border-t border-gold/20 grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl mb-3">{t("missionHeading")}</h2>
          <p className="measure text-muted">{mission.value ?? t("missionEmpty")}</p>
        </div>
        <div>
          <h2 className="text-2xl mb-3">{t("visionHeading")}</h2>
          <p className="measure text-muted">{vision.value ?? t("visionEmpty")}</p>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-6 py-12 border-t border-gold/20">
        <h2 className="eyebrow mb-6">{t("impactHeading")}</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {IMPACT_CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href="/work"
              className="border border-gold/30 rounded p-5 hover:border-gold transition-colors duration-150"
            >
              <p className="font-display text-lg mb-1">{tWork(`categories.${cat}`)}</p>
              <p className="text-2xs text-muted">
                {countByCategory[cat] ? `${countByCategory[cat]} published` : tWork("emptyState")}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-6 py-12 border-t border-gold/20 grid md:grid-cols-2 gap-6">
        <ImageSlot pageSlug="home" slotKey="home-1" locale={locale} />
        <ImageSlot pageSlug="home" slotKey="home-2" locale={locale} />
      </section>

      {partnerRows.length > 0 && (
        <section className="mx-auto max-w-[1180px] px-6 py-12 border-t border-gold/20">
          <h2 className="eyebrow mb-6">{t("partnersHeading")}</h2>
          <ul className="flex flex-wrap gap-8 items-center">
            {partnerRows.map((p) => (
              <li key={p.id} className="text-sm text-muted">
                {p.name}
              </li>
            ))}
          </ul>
          <Link href="/partners" className="inline-block mt-6 text-sm hover:text-gold border-b border-transparent hover:border-gold">
            {t("partnersCta")}
          </Link>
        </section>
      )}

      <section className="mx-auto max-w-[1180px] px-6 py-16 border-t border-gold/20">
        <h2 className="text-2xl mb-2">{t("newsletterHeading")}</h2>
        <p className="measure text-muted mb-6">{t("newsletterSub")}</p>
        <NewsletterForm
          sourcePage="home"
          locale={locale}
          labels={{
            emailLabel: tNewsletter("emailLabel"),
            consentLabel: tNewsletter("consentLabel"),
            submit: tNewsletter("submit"),
            success: tNewsletter("success"),
            already: tNewsletter("alreadySubscribed"),
            error: tNewsletter("error"),
          }}
        />
      </section>
    </main>
  );
}
