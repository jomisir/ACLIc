"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { requireRole, requestIp } from "@/auth/rbac";
import { writeAudit } from "@/auth/audit";
import { sanitizeRichText, sanitizePlainText } from "@/lib/sanitize";

const schema = z.object({
  slug: z.string().min(1),
  titleEn: z.string().optional(),
  titleAm: z.string().optional(),
  titleOm: z.string().optional(),
  // Bodies arrive as HTML from the rich text editor. They are sanitized
  // against a tight allowlist before storage — see src/lib/sanitize.ts.
  bodyEn: z.string().max(100_000).optional(),
  bodyAm: z.string().max(100_000).optional(),
  bodyOm: z.string().max(100_000).optional(),
});

export async function saveDraftPage(formData: FormData) {
  const user = await requireRole("superuser", "user");
  const data = schema.parse(Object.fromEntries(formData));

  await db
    .update(pages)
    .set({
      titleEn: sanitizePlainText(data.titleEn),
      titleAm: sanitizePlainText(data.titleAm),
      titleOm: sanitizePlainText(data.titleOm),
      bodyEn: sanitizeRichText(data.bodyEn),
      bodyAm: sanitizeRichText(data.bodyAm),
      bodyOm: sanitizeRichText(data.bodyOm),
      updatedBy: user.id,
      updatedAt: new Date(),
    })
    .where(eq(pages.slug, data.slug));

  await writeAudit({ userId: user.id, action: "update", objectType: "page", objectId: data.slug, ip: await requestIp() });
  revalidatePath(`/admin/pages/${data.slug}`);
  // An edit to an already-published record changes what visitors see, so the
  // public page has to be rebuilt too. Only revalidating the admin route means
  // the editor sees the fix and the public site keeps the old text until
  // someone toggles publish or the site is redeployed.
  revalidatePath(`/[locale]`, "layout");
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
