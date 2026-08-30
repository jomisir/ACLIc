import { db } from "@/db";
import { auditLog } from "@/db/schema";

export async function writeAudit(entry: {
  userId: string | null;
  action: string;
  objectType: string;
  objectId?: string | null;
  ip?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(auditLog).values({
    userId: entry.userId,
    action: entry.action,
    objectType: entry.objectType,
    objectId: entry.objectId ?? null,
    ip: entry.ip ?? null,
    metadata: entry.metadata ?? null,
  });
}
