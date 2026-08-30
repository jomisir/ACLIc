import { and, eq } from "drizzle-orm";
import Image from "next/image";
import { db } from "@/db";
import { imageSlots, pages } from "@/db/schema";
import type { Locale } from "@/i18n/routing";

const captionCol = { en: "captionEn", am: "captionAm", om: "captionOm" } as const;

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

  const [slot] = await db
    .select()
    .from(imageSlots)
    .where(and(eq(imageSlots.pageSlug, pageSlug), eq(imageSlots.slotKey, slotKey)))
    .limit(1);

  const caption = slot?.[captionCol[locale]] ?? slot?.captionEn ?? null;

  if (page?.status === "published" && slot?.mediaId) {
    return (
      <figure className="rounded overflow-hidden border border-gold/20">
        <Image
          src={`/api/media/${slot.mediaId}`}
          alt={caption ?? ""}
          width={800}
          height={600}
          className="w-full h-auto object-cover"
          sizes="(min-width: 768px) 50vw, 100vw"
        />
        {caption && <figcaption className="text-2xs text-muted px-2 py-1">{caption}</figcaption>}
      </figure>
    );
  }

  return (
    <div className="rounded border border-dashed border-gold/40 aspect-video flex items-center justify-center text-2xs text-muted bg-surface-raised">
      Image pending
    </div>
  );
}
