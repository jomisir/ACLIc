import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <main className="mx-auto max-w-[1180px] px-6 py-24 text-center">
      <p className="eyebrow mb-4">404</p>
      <h1 className="text-3xl mb-4">{t("heading")}</h1>
      <p className="measure mx-auto text-muted mb-8">{t("body")}</p>
      <Link href="/" className="inline-block border border-gold text-gold-deep dark:text-gold px-5 py-2.5 rounded hover:bg-gold/10 transition-colors duration-150">
        {t("cta")}
      </Link>
    </main>
  );
}
