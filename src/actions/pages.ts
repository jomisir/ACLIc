"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { requireRole, requestIp } from "@/auth/rbac";
import { writeAudit } from "@/auth/audit";

const schema = z.object({
  slug: z.string().min(1),
  titleEn: z.string().optional(),
  titleAm: z.string().optional(),
  titleOm: z.string().optional(),
  bodyEn: z.string().optional(),
  bodyAm: z.string().optional(),
  bodyOm: z.string().optional(),
});

export async function saveDraftPage(formData: FormData) {
  const user = await requireRole("superuser", "user");
  const data = schema.parse(Object.fromEntries(formData));

  await db
    .update(pages)
    .set({
      titleEn: data.titleEn || null,
      titleAm: data.titleAm || null,
      titleOm: data.titleOm || null,
      bodyEn: data.bodyEn || null,
      bodyAm: data.bodyAm || null,
      bodyOm: data.bodyOm || null,
      updatedBy: user.id,
      updatedAt: new Date(),
    })
    .where(eq(pages.slug, data.slug));

  await writeAudit({ userId: user.id, action: "update", objectType: "page", objectId: data.slug, ip: await requestIp() });
  revalidatePath(`/admin/pages/${data.slug}`);
}

export async function publishPage(slug: string) {
  const user = await requireRole("superuser");
  await db.update(pages).set({ status: "published", updatedBy: user.id, updatedAt: new Date() }).where(eq(pages.slug, slug));
  await writeAudit({ userId: user.id, action: "publish", objectType: "page", objectId: slug, ip: await requestIp() });
  revalidatePath(`/[locale]`, "layout");
}

export async function unpublishPage(slug: string) {
  const user = await requireRole("superuser");
  await db.update(pages).set({ status: "draft", updatedBy: user.id, updatedAt: new Date() }).where(eq(pages.slug, slug));
  await writeAudit({ userId: user.id, action: "unpublish", objectType: "page", objectId: slug, ip: await requestIp() });
  revalidatePath(`/[locale]`, "layout");
}
