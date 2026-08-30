"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { media } from "@/db/schema";
import { requireRole, requestIp } from "@/auth/rbac";
import { writeAudit } from "@/auth/audit";
import { processImage } from "@/lib/image-processing";
import { uploadToStorage } from "@/lib/storage";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB pre-processing cap

export async function updateMediaAlt(id: string, formData: FormData) {
  const user = await requireRole("superuser", "user");
  const altEn = String(formData.get("altEn") ?? "").trim() || null;
  const altAm = String(formData.get("altAm") ?? "").trim() || null;
  const altOm = String(formData.get("altOm") ?? "").trim() || null;

  await db.update(media).set({ altEn, altAm, altOm }).where(eq(media.id, id));
  await writeAudit({ userId: user.id, action: "update", objectType: "media_alt", objectId: id, ip: await requestIp() });
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
