"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { requireRole, requestIp } from "@/auth/rbac";
import { writeAudit } from "@/auth/audit";

export async function updateSetting(key: string, formData: FormData) {
  const user = await requireRole("superuser");

  const valueEn = String(formData.get("valueEn") ?? "").trim() || null;
  const valueAm = String(formData.get("valueAm") ?? "").trim() || null;
  const valueOm = String(formData.get("valueOm") ?? "").trim() || null;

  await db
    .update(settings)
    .set({ valueEn, valueAm, valueOm, updatedAt: new Date() })
    .where(eq(settings.key, key));

  await writeAudit({ userId: user.id, action: "update", objectType: "setting", objectId: key, ip: await requestIp() });
  revalidatePath("/admin/settings");
  revalidatePath("/[locale]", "layout");
}
