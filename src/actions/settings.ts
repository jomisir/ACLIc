"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { requireRole, requestIp } from "@/auth/rbac";
import { writeAudit } from "@/auth/audit";
import { sanitizeRichText, sanitizePlainText } from "@/lib/sanitize";

// Only these settings are authored as rich text. Everything else (URLs,
// contact details, social links) is plain text and is stripped of markup
// entirely — a <script> in the "contact phone" field should never survive.
const RICH_TEXT_KEYS = new Set(["mission_statement", "vision_statement"]);

export async function updateSetting(key: string, formData: FormData) {
  const user = await requireRole("superuser");

  const clean = RICH_TEXT_KEYS.has(key) ? sanitizeRichText : sanitizePlainText;

  const valueEn = clean(String(formData.get("valueEn") ?? ""));
  const valueAm = clean(String(formData.get("valueAm") ?? ""));
  const valueOm = clean(String(formData.get("valueOm") ?? ""));

  await db
    .update(settings)
    .set({ valueEn, valueAm, valueOm, updatedAt: new Date() })
    .where(eq(settings.key, key));

  await writeAudit({ userId: user.id, action: "update", objectType: "setting", objectId: key, ip: await requestIp() });
  revalidatePath("/admin/settings");
  revalidatePath("/[locale]", "layout");
}
