"use server";

import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { requireRole, requestIp } from "@/auth/rbac";
import { writeAudit } from "@/auth/audit";

export async function exportSubscribersCsv(): Promise<string> {
  const user = await requireRole("superuser");
  const rows = await db.select().from(subscribers);

  const header = "email,language,consent_at,confirmed,source_page,created_at";
  const lines = rows.map((r) =>
    [r.email, r.language, r.consentAt.toISOString(), r.confirmedAt ? "yes" : "no", r.sourcePage ?? "", r.createdAt.toISOString()]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );

  await writeAudit({ userId: user.id, action: "export", objectType: "subscribers", ip: await requestIp() });

  return [header, ...lines].join("\n");
}
