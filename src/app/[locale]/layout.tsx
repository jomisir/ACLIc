import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
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
    // Fallback only — every real page defines its own generateMetadata with
    // alternates pointing at its own path (see src/lib/metadata.ts). This
    // only applies to routes without one, like [locale]/not-found.tsx.
    alternates: {
      languages: {
        ...Object.fromEntries(routing.locales.map((l) => [l, `${base}/${l}`])),
        "x-default": `${base}/${routing.defaultLocale}`,
      },
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
  // No hasLocale()/notFound() check here on purpose: calling notFound() inside
  // a layout that renders its own <html> (a "root layout" in Next.js's App
  // Router model, which this is — see the multi-root-layouts pattern used
  // for /admin) is unsupported and can crash instead of 404ing
  // (https://github.com/vercel/next.js/issues/59180). The proxy/middleware
  // (src/middleware.ts) already validates the locale against routing.locales
  // for every matched request before it ever reaches this layout, and
  // generateStaticParams below only pre-renders the three known locales, so
  // this component never legitimately sees an unrecognized locale.
  setRequestLocale(locale);

  return (
    <html lang={locale} className={fontVariables} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        {/* messages={null} is next-intl's documented pattern for when client
           components only need routing (Link/useRouter/usePathname), not
           useTranslations — every client component here receives its
           strings as props from Server Components instead, so no message
           bundle needs to reach the browser at all. */}
        <NextIntlClientProvider messages={null}>
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
