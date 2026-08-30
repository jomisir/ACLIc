"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { partners } from "@/db/schema";
import { requireRole, requestIp } from "@/auth/rbac";
import { writeAudit } from "@/auth/audit";

const schema = z.object({
  id: z.string().uuid(),
  name: z.string().max(200).optional(),
  url: z.string().url().max(500).optional().or(z.literal("")),
  displayOrder: z.coerce.number().int().min(0).default(0),
});

export async function saveDraftPartner(formData: FormData) {
  const user = await requireRole("superuser", "user");
  const data = schema.parse(Object.fromEntries(formData));

  await db
    .update(partners)
    .set({
      name: data.name || null,
      url: data.url || null,
      displayOrder: data.displayOrder,
      isPlaceholder: !data.name,
      updatedAt: new Date(),
    })
    .where(eq(partners.id, data.id));

  await writeAudit({ userId: user.id, action: "update", objectType: "partner", objectId: data.id, ip: await requestIp() });
  revalidatePath(`/admin/partners`);
}

export async function publishPartner(id: string) {
  const user = await requireRole("superuser");
  await db.update(partners).set({ status: "published", updatedAt: new Date() }).where(eq(partners.id, id));
  await writeAudit({ userId: user.id, action: "publish", objectType: "partner", objectId: id, ip: await requestIp() });
  revalidatePath("/[locale]/partners", "page");
}

export async function unpublishPartner(id: string) {
  const user = await requireRole("superuser");
  await db.update(partners).set({ status: "draft", updatedAt: new Date() }).where(eq(partners.id, id));
  await writeAudit({ userId: user.id, action: "unpublish", objectType: "partner", objectId: id, ip: await requestIp() });
  revalidatePath("/[locale]/partners", "page");
}

export async function updatePartnerLogo(id: string, logoPath: string) {
  const user = await requireRole("superuser", "user");
  await db.update(partners).set({ logoPath, updatedAt: new Date() }).where(eq(partners.id, id));
  await writeAudit({ userId: user.id, action: "update", objectType: "partner_logo", objectId: id, ip: await requestIp() });
}

export async function uploadPartnerLogo(id: string, formData: FormData) {
  const { uploadImage } = await import("./media");
  const row = await uploadImage(formData);
  await updatePartnerLogo(id, row.filePath);
  return row;
}
