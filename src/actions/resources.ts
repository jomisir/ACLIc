"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { resources } from "@/db/schema";
import { requireRole, requestIp } from "@/auth/rbac";
import { writeAudit } from "@/auth/audit";
import { uploadToStorage } from "@/lib/storage";
import { sanitizePlainText } from "@/lib/sanitize";

const metaSchema = z.object({
  titleEn: z.string().max(300).optional(),
  titleAm: z.string().max(300).optional(),
  titleOm: z.string().max(300).optional(),
  visibility: z.enum(["public", "internal"]),
});

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export async function uploadResource(formData: FormData) {
  const user = await requireRole("superuser", "user");
  const data = metaSchema.parse(Object.fromEntries(formData));

  const titleEn = sanitizePlainText(data.titleEn);
  if (!titleEn) throw new Error("An English title is required.");

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No file provided.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("File too large.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = `resources/${randomUUID()}-${file.name}`;
  await uploadToStorage(path, buffer, file.type || "application/octet-stream");

  await db.insert(resources).values({
    titleEn,
    titleAm: sanitizePlainText(data.titleAm),
    titleOm: sanitizePlainText(data.titleOm),
    filePath: path,
    fileSize: file.size,
    uploadedBy: user.id,
    visibility: data.visibility,
    status: "draft",
  });

  await writeAudit({ userId: user.id, action: "create", objectType: "resource", ip: await requestIp() });
  revalidatePath("/admin/resources");
}

/**
 * Edits a resource's metadata. The stored file is deliberately not replaceable
 * here — replacing it would orphan the old object and change what an already
 * published link resolves to. Delete and re-upload instead.
 */
export async function updateResource(id: string, formData: FormData) {
  const user = await requireRole("superuser", "user");
  const data = metaSchema.parse(Object.fromEntries(formData));

  await db
    .update(resources)
    .set({
      titleEn: sanitizePlainText(data.titleEn),
      titleAm: sanitizePlainText(data.titleAm),
      titleOm: sanitizePlainText(data.titleOm),
      visibility: data.visibility,
    })
    .where(eq(resources.id, id));

  await writeAudit({ userId: user.id, action: "update", objectType: "resource", objectId: id, ip: await requestIp() });
  revalidatePath("/admin/resources");
  revalidatePath(`/admin/resources/${id}`);
  revalidatePath("/[locale]/resources", "page");
}

export async function publishResource(id: string) {
  const user = await requireRole("superuser");
  await db.update(resources).set({ status: "published" }).where(eq(resources.id, id));
  await writeAudit({ userId: user.id, action: "publish", objectType: "resource", objectId: id, ip: await requestIp() });
  revalidatePath("/[locale]/resources", "page");
}

export async function unpublishResource(id: string) {
  const user = await requireRole("superuser");
  await db.update(resources).set({ status: "draft" }).where(eq(resources.id, id));
  await writeAudit({ userId: user.id, action: "unpublish", objectType: "resource", objectId: id, ip: await requestIp() });
  revalidatePath("/[locale]/resources", "page");
}

export async function deleteResource(id: string) {
  const user = await requireRole("superuser");
  await db.delete(resources).where(eq(resources.id, id));
  await writeAudit({ userId: user.id, action: "delete", objectType: "resource", objectId: id, ip: await requestIp() });
  revalidatePath("/admin/resources");
}
