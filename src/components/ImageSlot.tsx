import { and, eq } from "drizzle-orm";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { imageSlots, media, pages } from "@/db/schema";
import type { Locale } from "@/i18n/routing";

const captionCol = { en: "captionEn", am: "captionAm", om: "captionOm" } as const;
const altCol = { en: "altEn", am: "altAm", om: "altOm" } as const;

export async function ImageSlot({
  pageSlug,
  slotKey,
  locale,
}: {
  pageSlug: string;
  slotKey: string;
  locale: Locale;
}) {
  const [page] = await db.select({ status: pages.status }).from(pages).where(eq(pages.slug, pageSlug)).limit(1);

  const [row] = await db
    .select({ slot: imageSlots, media })
    .from(imageSlots)
    .leftJoin(media, eq(media.id, imageSlots.mediaId))
    .where(and(eq(imageSlots.pageSlug, pageSlug), eq(imageSlots.slotKey, slotKey)))
    .limit(1);

  const slot = row?.slot;
  const caption = slot?.[captionCol[locale]] ?? slot?.captionEn ?? null;

  // The alt text comes from the media library, not the caption. They are
  // different things: the caption is visible prose about the picture, the alt
  // is the picture's text alternative. Announcing the caption twice — once as
  // alt, once as the figcaption right beside it — is worse for a screen reader
  // than leaving alt empty, so when no alt has been written the figcaption is
  // left to do the work alone.
  const alt = row?.media?.[altCol[locale]] ?? row?.media?.altEn ?? "";

  if (page?.status === "published" && slot?.mediaId) {
    return (
      <figure className="rounded overflow-hidden border border-gold/20">
        <Image
          src={`/api/media/${slot.mediaId}`}
          alt={alt}
          width={800}
          height={600}
          className="w-full h-auto object-cover"
          sizes="(min-width: 768px) 50vw, 100vw"
        />
        {caption && <figcaption className="text-2xs text-muted px-2 py-1">{caption}</figcaption>}
      </figure>
    );
  }

  // Reuses the existing Leaders.photoPending string rather than introducing a
  // new key: a new key would need Amharic and Afaan Oromo copy written for it,
  // and those files are reserved for a native-speaker pass. The wording fits,
  // and this placeholder was previously hardcoded English on all three locales.
  const t = await getTranslations({ locale, namespace: "Leaders" });

  return (
    <div className="rounded border border-dashed border-gold/40 aspect-video flex items-center justify-center text-2xs text-muted bg-surface-raised">
      {t("photoPending")}
    </div>
  );
}
