"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { imageSlots } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { requireRole, requestIp } from "@/auth/rbac";
import { writeAudit } from "@/auth/audit";
import { sanitizePlainText } from "@/lib/sanitize";

// Image slots appear on home, about, structure, work and membership, all of
// which are statically generated. Without this the editor uploads an image or
// saves a caption, sees it in the admin panel, and the public site keeps
// showing "pending" until the next deploy. Revalidating the locale layout
// covers every slot-bearing page at once, which is what publishPage does too.
function revalidatePublicPages() {
  revalidatePath("/[locale]", "layout");
}

export async function uploadImageSlot(pageSlug: string, slotKey: string, formData: FormData) {
  const user = await requireRole("superuser", "user");
  const { uploadImage } = await import("./media");
  const row = await uploadImage(formData);

  const existing = await db
    .select()
    .from(imageSlots)
    .where(and(eq(imageSlots.pageSlug, pageSlug), eq(imageSlots.slotKey, slotKey)))
    .limit(1);

  if (existing.length) {
    await db
      .update(imageSlots)
      .set({ mediaId: row.id })
      .where(and(eq(imageSlots.pageSlug, pageSlug), eq(imageSlots.slotKey, slotKey)));
  } else {
    await db.insert(imageSlots).values({ pageSlug, slotKey, mediaId: row.id });
  }

  await writeAudit({
    userId: user.id,
    action: "update",
    objectType: "image_slot",
    objectId: `${pageSlug}/${slotKey}`,
    ip: await requestIp(),
  });

  revalidatePublicPages();
  return row;
}

export async function setImageSlotCaption(pageSlug: string, slotKey: string, formData: FormData) {
  const user = await requireRole("superuser", "user");
  // All three are written on every save, so the form must submit all three —
  // see the locale tabs in ImageSlotManager. A form carrying only captionEn
  // would silently blank the Amharic and Afaan Oromo captions.
  const captionEn = sanitizePlainText(formData.get("captionEn")?.toString());
  const captionAm = sanitizePlainText(formData.get("captionAm")?.toString());
  const captionOm = sanitizePlainText(formData.get("captionOm")?.toString());

  const existing = await db
    .select()
    .from(imageSlots)
    .where(and(eq(imageSlots.pageSlug, pageSlug), eq(imageSlots.slotKey, slotKey)))
    .limit(1);

  if (existing.length) {
    await db
      .update(imageSlots)
      .set({ captionEn, captionAm, captionOm })
      .where(and(eq(imageSlots.pageSlug, pageSlug), eq(imageSlots.slotKey, slotKey)));
  } else {
    await db.insert(imageSlots).values({ pageSlug, slotKey, captionEn, captionAm, captionOm });
  }

  await writeAudit({
    userId: user.id,
    action: "update",
    objectType: "image_slot_caption",
    objectId: `${pageSlug}/${slotKey}`,
    ip: await requestIp(),
  });

  revalidatePublicPages();
}
