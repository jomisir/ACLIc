import { getTranslations } from "next-intl/server";
import { getSetting } from "@/lib/settings";
import type { Locale } from "@/i18n/routing";

export default async function ContactPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Contact" });

  const [email, phone, address, facebook, twitter, instagram, linkedin] = await Promise.all([
    getSetting("contact_email", locale),
    getSetting("contact_phone", locale),
    getSetting("contact_address", locale),
    getSetting("social_facebook", locale),
    getSetting("social_twitter", locale),
    getSetting("social_instagram", locale),
    getSetting("social_linkedin", locale),
  ]);

  const socials = [
    ["Facebook", facebook.value],
    ["Twitter / X", twitter.value],
    ["Instagram", instagram.value],
    ["LinkedIn", linkedin.value],
  ].filter(([, url]) => url) as [string, string][];

  return (
    <main className="mx-auto max-w-[1180px] px-6 py-16">
      <p className="eyebrow mb-4">{t("eyebrow")}</p>
      <h1 className="text-3xl mb-12 max-w-2xl">{t("heading")}</h1>

      <div className="grid sm:grid-cols-2 gap-8 max-w-2xl">
        <div>
          <h2 className="eyebrow mb-2">{t("emailHeading")}</h2>
          {email.value ? (
            <a href={`mailto:${email.value}`} className="hover:text-gold">{email.value}</a>
          ) : (
            <p className="text-muted text-sm">Not yet published.</p>
          )}
        </div>
        <div>
          <h2 className="eyebrow mb-2">{t("phoneHeading")}</h2>
          <p>{phone.value ?? <span className="text-muted text-sm">Not yet published.</span>}</p>
        </div>
        <div>
          <h2 className="eyebrow mb-2">{t("addressHeading")}</h2>
          <p className="whitespace-pre-line">{address.value ?? <span className="text-muted text-sm">Not yet published.</span>}</p>
        </div>
        {socials.length > 0 && (
          <div>
            <h2 className="eyebrow mb-2">{t("socialHeading")}</h2>
            <ul className="flex flex-col gap-1">
              {socials.map(([label, url]) => (
                <li key={label}>
                  <a href={url} target="_blank" rel="noreferrer noopener" className="hover:text-gold">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
