"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { imageSlots } from "@/db/schema";
import { requireRole, requestIp } from "@/auth/rbac";
import { writeAudit } from "@/auth/audit";

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

  return row;
}

export async function setImageSlotCaption(pageSlug: string, slotKey: string, formData: FormData) {
  const user = await requireRole("superuser", "user");
  const captionEn = String(formData.get("captionEn") ?? "").trim() || null;
  const captionAm = String(formData.get("captionAm") ?? "").trim() || null;
  const captionOm = String(formData.get("captionOm") ?? "").trim() || null;

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
}
