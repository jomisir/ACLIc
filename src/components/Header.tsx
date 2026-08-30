import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileNav } from "./MobileNav";
import type { Locale } from "@/i18n/routing";

const navKeys = [
  ["/about", "about"],
  ["/structure", "structure"],
  ["/leaders", "leaders"],
  ["/work", "work"],
  ["/partners", "partners"],
  ["/membership", "membership"],
  ["/resources", "resources"],
  ["/contact", "contact"],
] as const;

export async function Header() {
  const t = await getTranslations("Nav");
  const tCommon = await getTranslations("Common");
  const locale = (await getLocale()) as Locale;

  const links = navKeys.map(([href, key]) => ({ href, label: t(key) }));

  return (
    <header className="relative border-b border-gold/30">
      <div className="mx-auto max-w-[1180px] px-6 py-4 flex items-center justify-between gap-6">
        <Link href="/" className="font-display text-xl tracking-[-0.02em]">
          ACLIC
        </Link>
        <nav aria-label="Primary" className="hidden md:flex items-center gap-6 text-sm">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="hover:text-gold border-b border-transparent hover:border-gold transition-colors duration-150"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/search"
            className="text-2xs uppercase tracking-[0.12em] border border-gold/40 rounded px-3 py-1.5 hover:border-gold transition-colors duration-150"
          >
            {t("search")}
          </Link>
          <LanguageSwitcher locale={locale} label={tCommon("language")} />
          <ThemeToggle labels={{ light: tCommon("lightMode"), dark: tCommon("darkMode") }} />
          <MobileNav
            links={[{ href: "/", label: t("home") }, ...links, { href: "/search", label: t("search") }]}
            menuLabel={tCommon("menu")}
            closeLabel={tCommon("close")}
          />
        </div>
      </div>
    </header>
  );
}
