import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { NewsletterForm } from "./NewsletterForm";
import { getSetting } from "@/lib/settings";
import type { Locale } from "@/i18n/routing";

export async function Footer() {
  const t = await getTranslations("Footer");
  const tNav = await getTranslations("Nav");
  const tNewsletter = await getTranslations("Newsletter");
  const locale = (await getLocale()) as Locale;
  const [email, phone, facebook, twitter, instagram, linkedin] = await Promise.all([
    getSetting("contact_email", locale),
    getSetting("contact_phone", locale),
    getSetting("social_facebook", locale),
    getSetting("social_twitter", locale),
    getSetting("social_instagram", locale),
    getSetting("social_linkedin", locale),
  ]);

  const socials = [
    ["Facebook", facebook.value],
    ["Twitter/X", twitter.value],
    ["Instagram", instagram.value],
    ["LinkedIn", linkedin.value],
  ].filter(([, url]) => url) as [string, string][];

  return (
    <footer className="border-t border-gold/30 mt-24">
      <div className="mx-auto max-w-[1180px] px-6 py-16 grid gap-12 md:grid-cols-3">
        <div>
          <p className="font-display text-xl mb-2">ACLIC</p>
          <p className="text-muted text-sm measure">{t("tagline")}</p>
          {email.value && (
            <p className="text-sm mt-4">
              <a href={`mailto:${email.value}`} className="hover:text-gold">
                {email.value}
              </a>
            </p>
          )}
          {phone.value && <p className="text-sm">{phone.value}</p>}
          {socials.length > 0 && (
            <ul className="flex gap-4 mt-4 text-sm">
              {socials.map(([label, url]) => (
                <li key={label}>
                  <a href={url} className="hover:text-gold" target="_blank" rel="noreferrer noopener">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="eyebrow mb-3">{t("quickLinks")}</p>
          <ul className="flex flex-col gap-2 text-sm">
            {(["about", "structure", "leaders", "work", "partners", "membership", "resources", "contact"] as const).map(
              (key) => (
                <li key={key}>
                  <Link href={`/${key}`} className="hover:text-gold">
                    {tNav(key)}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </div>

        <div>
          <p className="eyebrow mb-3">{tNewsletter("emailLabel")}</p>
          <NewsletterForm
            sourcePage="footer"
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
        </div>
      </div>

      <div className="border-t border-gold/20">
        <div className="mx-auto max-w-[1180px] px-6 py-6 flex flex-wrap gap-x-6 gap-y-2 text-2xs text-muted">
          <Link href="/privacy" className="hover:text-gold">
            {t("legal")}: Privacy
          </Link>
          <Link href="/safeguarding" className="hover:text-gold">
            Safeguarding
          </Link>
          <span>&copy; {new Date().getFullYear()} ACLIC. {t("rights")}</span>
        </div>
      </div>
    </footer>
  );
}
