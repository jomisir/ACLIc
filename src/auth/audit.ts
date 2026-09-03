import { and, isNotNull, lt } from "drizzle-orm";
import { db } from "@/db";
import { auditLog } from "@/db/schema";

/**
 * How long an IP address stays attached to an audit row.
 *
 * The rest of the row — who did what to which object, and when — is kept
 * indefinitely, because that is the accountability record. The IP is not:
 * the administrators here are children, and holding a minor's IP address and
 * activity timestamps forever is more than the accountability purpose needs.
 * Ninety days covers any realistic "who changed this, and from where" question
 * while keeping the retention easy to state plainly in the privacy notice.
 */
export const AUDIT_IP_RETENTION_DAYS = 90;

/**
 * Shared hosting gives us no cron hook, so the sweep piggybacks on ordinary
 * writes — the same approach `src/lib/rate-limit.ts` and `src/lib/analytics.ts`
 * take. Audit writes are far rarer than page views, so this runs at a much
 * higher rate than the analytics sweep and still costs almost nothing.
 */
const SWEEP_PROBABILITY = 0.05;

/**
 * Nulls the IP on audit rows past the retention window, leaving actor, action,
 * object and timestamp intact. `isNotNull` keeps the statement from rewriting
 * rows that have already been swept.
 */
export async function pruneAuditIps() {
  const cutoff = new Date(Date.now() - AUDIT_IP_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await db
    .update(auditLog)
    .set({ ip: null })
    .where(and(lt(auditLog.createdAt, cutoff), isNotNull(auditLog.ip)));
}

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

  if (Math.random() < SWEEP_PROBABILITY) {
    // Best-effort. A failed sweep must never turn a successful admin action
    // into an error the editor sees.
    try {
      await pruneAuditIps();
    } catch (err) {
      console.error("[audit] IP retention sweep failed:", err);
    }
  }
}
