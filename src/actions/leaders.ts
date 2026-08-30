"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { leaders } from "@/db/schema";
import { requireRole, requestIp } from "@/auth/rbac";
import { writeAudit } from "@/auth/audit";
import { sanitizeRichText, sanitizePlainText } from "@/lib/sanitize";

const schema = z.object({
  id: z.string().uuid(),
  fullName: z.string().max(200).optional(),
  roleTitleEn: z.string().max(200).optional(),
  roleTitleAm: z.string().max(200).optional(),
  roleTitleOm: z.string().max(200).optional(),
  bioEn: z.string().max(100_000).optional(),
  bioAm: z.string().max(100_000).optional(),
  bioOm: z.string().max(100_000).optional(),
  displayOrder: z.coerce.number().int().min(0).default(0),
});

export async function saveDraftLeader(formData: FormData) {
  const user = await requireRole("superuser", "user");
  const data = schema.parse(Object.fromEntries(formData));

  await db
    .update(leaders)
    .set({
      fullName: sanitizePlainText(data.fullName) ?? "",
      roleTitleEn: sanitizePlainText(data.roleTitleEn),
      roleTitleAm: sanitizePlainText(data.roleTitleAm),
      roleTitleOm: sanitizePlainText(data.roleTitleOm),
      bioEn: sanitizeRichText(data.bioEn),
      bioAm: sanitizeRichText(data.bioAm),
      bioOm: sanitizeRichText(data.bioOm),
      displayOrder: data.displayOrder,
      updatedAt: new Date(),
    })
    .where(eq(leaders.id, data.id));

  await writeAudit({ userId: user.id, action: "update", objectType: "leader", objectId: data.id, ip: await requestIp() });
  revalidatePath(`/admin/leaders/${data.id}`);
}

/** Superuser only — this is the safeguard gate: a profile cannot go public without it. */
export async function setGuardianConsent(id: string, consent: boolean) {
  const user = await requireRole("superuser");
  await db
    .update(leaders)
    .set({ guardianConsent: consent, consentDate: consent ? new Date().toISOString().slice(0, 10) : null })
    .where(eq(leaders.id, id));
  await writeAudit({
    userId: user.id,
    action: "update",
    objectType: "leader_consent",
    objectId: id,
    ip: await requestIp(),
    metadata: { consent },
  });
  revalidatePath(`/admin/leaders/${id}`);
}

export async function publishLeader(id: string) {
  const user = await requireRole("superuser");

  const [leader] = await db.select().from(leaders).where(eq(leaders.id, id)).limit(1);
  if (!leader) throw new Error("Leader not found.");
  if (!leader.guardianConsent) {
    throw new Error("Cannot publish: guardian consent has not been recorded for this profile.");
  }

  await db.update(leaders).set({ status: "published", updatedAt: new Date() }).where(eq(leaders.id, id));
  await writeAudit({ userId: user.id, action: "publish", objectType: "leader", objectId: id, ip: await requestIp() });
  revalidatePath("/[locale]/leaders", "page");
}

/** One-click unpublish — takes a profile down immediately without deleting it. */
export async function unpublishLeader(id: string) {
  const user = await requireRole("superuser");
  await db.update(leaders).set({ status: "draft", updatedAt: new Date() }).where(eq(leaders.id, id));
  await writeAudit({ userId: user.id, action: "unpublish", objectType: "leader", objectId: id, ip: await requestIp() });
  revalidatePath("/[locale]/leaders", "page");
}

export async function updateLeaderPhoto(id: string, photoPath: string) {
  const user = await requireRole("superuser", "user");
  await db.update(leaders).set({ photoPath, updatedAt: new Date() }).where(eq(leaders.id, id));
  await writeAudit({ userId: user.id, action: "update", objectType: "leader_photo", objectId: id, ip: await requestIp() });
}

export async function uploadLeaderPhoto(id: string, formData: FormData) {
  const { uploadImage } = await import("./media");
  const row = await uploadImage(formData);
  await updateLeaderPhoto(id, row.filePath);
  return row;
}
