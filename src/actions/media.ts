"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { media } from "@/db/schema";
import { requireRole, requestIp } from "@/auth/rbac";
import { writeAudit } from "@/auth/audit";
import { processImage } from "@/lib/image-processing";
import { revalidatePath } from "next/cache";
import { uploadToStorage, deleteFromStorage } from "@/lib/storage";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB pre-processing cap

export async function updateMediaAlt(id: string, formData: FormData) {
  const user = await requireRole("superuser", "user");
  const altEn = String(formData.get("altEn") ?? "").trim() || null;
  const altAm = String(formData.get("altAm") ?? "").trim() || null;
  const altOm = String(formData.get("altOm") ?? "").trim() || null;

  await db.update(media).set({ altEn, altAm, altOm }).where(eq(media.id, id));
  await writeAudit({ userId: user.id, action: "update", objectType: "media_alt", objectId: id, ip: await requestIp() });
  revalidatePath("/admin/media");
  // Alt text is read by ImageSlot on the statically generated public pages.
  revalidatePath("/[locale]", "layout");
}

/**
 * Superuser only. Without this nothing uploaded could ever be removed —
 * the library only grew.
 *
 * `image_slots.media_id` is ON DELETE SET NULL, so any slot using this image
 * reverts to its "pending" placeholder rather than breaking.
 */
export async function deleteMedia(id: string) {
  const user = await requireRole("superuser");

  const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  await db.delete(media).where(eq(media.id, id));

  if (row?.filePath) {
    try {
      await deleteFromStorage(row.filePath);
    } catch (err) {
      console.error(`[media] row ${id} deleted but ${row.filePath} remains in storage:`, err);
    }
  }

  await writeAudit({ userId: user.id, action: "delete", objectType: "media", objectId: id, ip: await requestIp() });
  revalidatePath("/admin/media");
  revalidatePath("/[locale]", "layout");
}

export async function uploadImage(formData: FormData) {
  const user = await requireRole("superuser", "user");

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No file provided.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("File too large.");
  if (!file.type.startsWith("image/")) throw new Error("Only image uploads are allowed.");

  const inputBuffer = Buffer.from(await file.arrayBuffer());
  const { buffer, width, height } = await processImage(inputBuffer);

  const path = `uploads/${randomUUID()}.webp`;
  await uploadToStorage(path, buffer, "image/webp");

  const [row] = await db
    .insert(media)
    .values({
      filePath: path,
      width,
      height,
      uploadedBy: user.id,
    })
    .returning();

  await writeAudit({ userId: user.id, action: "create", objectType: "media", objectId: row.id, ip: await requestIp() });

  return row;
}
