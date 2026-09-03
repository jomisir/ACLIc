"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { leaders } from "@/db/schema";
import { requireRole, requestIp } from "@/auth/rbac";
import { writeAudit } from "@/auth/audit";
import { sanitizeRichText, sanitizePlainText } from "@/lib/sanitize";
import { deleteFromStorage } from "@/lib/storage";

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
  // An edit to an already-published record changes what visitors see, so the
  // public page has to be rebuilt too. Only revalidating the admin route means
  // the editor sees the fix and the public site keeps the old text until
  // someone toggles publish or the site is redeployed.
  //
  // The whole locale subtree, not just /leaders: a slot's ROLE TITLE also
  // labels its node in the structure diagram, which appears on the home page
  // and on /structure. Renaming department slot #5 to "Child Protection" has
  // to reach both of those, not only the leaders list.
  revalidatePath("/[locale]", "layout");
}

/**
 * Superuser only — this is the safeguard gate: a profile cannot go public
 * without it.
 *
 * Withdrawing consent takes the profile down in the same write. A guardian
 * who withdraws consent is asking for the child to come off the site, and
 * that must not depend on someone remembering to press Unpublish afterwards.
 * The public queries also require consent independently (see the leaders
 * page, search, and both media routes), so a row can never be visible
 * without it even if `status` is changed some other way.
 */
export async function setGuardianConsent(id: string, consent: boolean) {
  const user = await requireRole("superuser");
  await db
    .update(leaders)
    .set({
      guardianConsent: consent,
      consentDate: consent ? new Date().toISOString().slice(0, 10) : null,
      ...(consent ? {} : { status: "draft" as const, updatedAt: new Date() }),
    })
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
  revalidatePath("/[locale]/leaders", "page");
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

/**
 * Superuser only — erases the child's personal data from a leadership slot.
 *
 * Leaders are fixed org-chart slots, not free-form records, so the answer to
 * "remove this child from the site" is to empty the slot rather than delete
 * the row: the position (`roleTitleEn/Am/Om`) and its display order belong to
 * the structure and stay. Name, biographies, photograph and the recorded
 * consent all go, the photo is removed from storage, and the slot returns to
 * an unpublished empty state ready for whoever holds the position next.
 *
 * Unpublishing hides a profile; this is the stronger request, for a guardian
 * who wants the data gone rather than hidden.
 */
export async function clearLeaderProfile(id: string) {
  const user = await requireRole("superuser");

  const [row] = await db.select().from(leaders).where(eq(leaders.id, id)).limit(1);
  if (!row) throw new Error("Leader not found.");

  await db
    .update(leaders)
    .set({
      fullName: "",
      bioEn: null,
      bioAm: null,
      bioOm: null,
      photoPath: null,
      guardianConsent: false,
      consentDate: null,
      status: "draft",
      updatedAt: new Date(),
    })
    .where(eq(leaders.id, id));

  // The database row is already cleared, so a storage failure must not leave
  // the caller thinking nothing happened — log it and carry on.
  if (row.photoPath) {
    try {
      await deleteFromStorage(row.photoPath);
    } catch (err) {
      console.error(`[leaders] profile ${id} cleared but ${row.photoPath} remains in storage:`, err);
    }
  }

  await writeAudit({
    userId: user.id,
    action: "delete",
    objectType: "leader_profile",
    objectId: id,
    ip: await requestIp(),
  });

  revalidatePath(`/admin/leaders/${id}`);
  revalidatePath("/admin/leaders");
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
