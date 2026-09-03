import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { searchContent } from "@/lib/search";
import { pageMetadata } from "@/lib/metadata";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Search" });
  return {
    ...pageMetadata({
      locale,
      path: "/search",
      title: t("heading"),
      description: t("metaDescription"),
    }),
    // A search results page has no business in an index.
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  const { q = "" } = await searchParams;
  const t = await getTranslations({ locale, namespace: "Search" });

  const query = q.trim();
  const results = query.length >= 2 ? await searchContent(query, locale) : [];

  const kindLabel = {
    leader: t("kinds.leader"),
    work: t("kinds.work"),
    resource: t("kinds.resource"),
    page: t("kinds.page"),
  } as const;

  return (
    <main className="mx-auto max-w-[1180px] px-6 py-16">
      <p className="eyebrow mb-4">{t("eyebrow")}</p>
      <h1 className="text-3xl mb-8 max-w-2xl">{t("heading")}</h1>

      {/* A plain GET form: works with JavaScript disabled, and the query
          stays in the URL so results are linkable and shareable. */}
      <form action={`/${locale}/search`} method="get" role="search" className="mb-12 flex gap-2 max-w-lg">
        <label htmlFor="site-search" className="sr-only">
          {t("inputLabel")}
        </label>
        <input
          id="site-search"
          name="q"
          type="search"
          defaultValue={query}
          placeholder={t("placeholder")}
          className="flex-1 border border-gold/40 rounded px-3 py-2 bg-transparent focus-visible:border-gold"
        />
        <button
          type="submit"
          className="border border-gold text-gold-deep dark:text-gold px-4 py-2 rounded hover:bg-gold/10 transition-colors duration-150"
        >
          {t("submit")}
        </button>
      </form>

      {query.length === 0 ? null : query.length < 2 ? (
        <p className="measure text-muted">{t("tooShort")}</p>
      ) : results.length === 0 ? (
        <p className="measure text-muted">{t("noResults", { query })}</p>
      ) : (
        <>
          <p className="eyebrow mb-6">{t("resultCount", { count: results.length })}</p>
          <ul className="flex flex-col gap-6">
            {results.map((r, i) => (
              <li key={`${r.kind}-${i}`} className="border-l-2 border-gold/40 pl-4">
                <p className="text-2xs uppercase tracking-[0.12em] text-muted mb-1">
                  {kindLabel[r.kind]}
                </p>
                <Link
                  href={r.href}
                  className="font-display text-lg hover:text-gold border-b border-transparent hover:border-gold transition-colors duration-150"
                >
                  {r.title}
                </Link>
                {r.snippet && <p className="measure text-sm text-muted mt-1">{r.snippet}</p>}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
