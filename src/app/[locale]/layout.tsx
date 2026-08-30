import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { fontVariables } from "@/lib/fonts";
import { ThemeScript } from "@/components/ThemeScript";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Home" });
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return {
    metadataBase: new URL(base),
    title: {
      default: `ACLIC — ${t("eyebrow")}`,
      template: "%s — ACLIC",
    },
    description: t("heroSub"),
    alternates: {
      languages: Object.fromEntries(routing.locales.map((l) => [l, `${base}/${l}`])),
    },
    openGraph: {
      type: "website",
      locale,
      siteName: "ACLIC",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    <html lang={locale} className={fontVariables} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        {/* No `messages` passed: no client component reads translations via
           hooks anymore (they receive strings as props from Server
           Components), so this only supplies the locale/routing context
           that next-intl's client-side Link/useRouter/usePathname need. */}
        <NextIntlClientProvider messages={{}}>
          <SkipLink locale={locale as Locale} />
          <Header />
          <div id="main-content">{children}</div>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

async function SkipLink({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Nav" });
  return (
    <a href="#main-content" className="skip-link">
      {t("skipToContent")}
    </a>
  );
}
