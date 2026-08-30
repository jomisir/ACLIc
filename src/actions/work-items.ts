"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { workItems, workCategoryEnum } from "@/db/schema";
import { requireRole, requestIp } from "@/auth/rbac";
import { writeAudit } from "@/auth/audit";
import { sanitizeRichText, sanitizePlainText } from "@/lib/sanitize";

const schema = z.object({
  category: z.enum(workCategoryEnum.enumValues),
  titleEn: z.string().max(300).optional(),
  titleAm: z.string().max(300).optional(),
  titleOm: z.string().max(300).optional(),
  summaryEn: z.string().max(100_000).optional(),
  summaryAm: z.string().max(100_000).optional(),
  summaryOm: z.string().max(100_000).optional(),
  occurredOn: z.string().optional(),
  visibility: z.enum(["public", "internal"]),
});

export async function createWorkItem(formData: FormData) {
  const user = await requireRole("superuser", "user");
  const data = schema.parse(Object.fromEntries(formData));

  await db.insert(workItems).values({
    category: data.category,
    titleEn: sanitizePlainText(data.titleEn),
    titleAm: sanitizePlainText(data.titleAm),
    titleOm: sanitizePlainText(data.titleOm),
    summaryEn: sanitizeRichText(data.summaryEn),
    summaryAm: sanitizeRichText(data.summaryAm),
    summaryOm: sanitizeRichText(data.summaryOm),
    occurredOn: data.occurredOn || null,
    visibility: data.visibility,
  });

  await writeAudit({ userId: user.id, action: "create", objectType: "work_item", ip: await requestIp() });
  revalidatePath("/admin/work");
}

export async function updateWorkItem(id: string, formData: FormData) {
  const user = await requireRole("superuser", "user");
  const data = schema.parse(Object.fromEntries(formData));

  await db
    .update(workItems)
    .set({
      category: data.category,
      titleEn: sanitizePlainText(data.titleEn),
      titleAm: sanitizePlainText(data.titleAm),
      titleOm: sanitizePlainText(data.titleOm),
      summaryEn: sanitizeRichText(data.summaryEn),
      summaryAm: sanitizeRichText(data.summaryAm),
      summaryOm: sanitizeRichText(data.summaryOm),
      occurredOn: data.occurredOn || null,
      visibility: data.visibility,
      updatedAt: new Date(),
    })
    .where(eq(workItems.id, id));

  await writeAudit({ userId: user.id, action: "update", objectType: "work_item", objectId: id, ip: await requestIp() });
  revalidatePath("/admin/work");
}

export async function publishWorkItem(id: string) {
  const user = await requireRole("superuser");
  await db.update(workItems).set({ status: "published", updatedAt: new Date() }).where(eq(workItems.id, id));
  await writeAudit({ userId: user.id, action: "publish", objectType: "work_item", objectId: id, ip: await requestIp() });
  revalidatePath("/[locale]/work", "page");
}

export async function unpublishWorkItem(id: string) {
  const user = await requireRole("superuser");
  await db.update(workItems).set({ status: "draft", updatedAt: new Date() }).where(eq(workItems.id, id));
  await writeAudit({ userId: user.id, action: "unpublish", objectType: "work_item", objectId: id, ip: await requestIp() });
  revalidatePath("/[locale]/work", "page");
}

export async function deleteWorkItem(id: string) {
  const user = await requireRole("superuser");
  await db.delete(workItems).where(eq(workItems.id, id));
  await writeAudit({ userId: user.id, action: "delete", objectType: "work_item", objectId: id, ip: await requestIp() });
  revalidatePath("/admin/work");
}
