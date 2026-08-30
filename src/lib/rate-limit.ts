import { and, eq, gt, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimitEvents } from "@/db/schema";

// Rows older than any live window are dead weight. The old VPS deployment
// could have swept them with cron; on shared hosting there is no such hook,
// and Neon's free tier is storage-capped, so sweep opportunistically instead.
const SWEEP_PROBABILITY = 0.01;
const SWEEP_OLDER_THAN_MINUTES = 24 * 60;

/**
 * Returns true if `key` has exceeded `limit` events within `windowMinutes`
 * for the given `scope`. Records this attempt either way.
 *
 * Note on atomicity: the count and the insert are two separate statements,
 * so under heavy concurrency a small number of extra attempts can slip
 * through before the counter catches up. That was equally true of the
 * previous postgres-js implementation — neither wrapped these in a
 * transaction, both ran in autocommit — so moving to the Neon HTTP driver
 * (which cannot do interactive transactions) changes nothing here. This is
 * a throttle to blunt brute-force and spam, not a hard security boundary;
 * the actual auth check is argon2 verification in src/auth/index.ts.
 */
export async function isRateLimited(
  scope: string,
  key: string,
  limit: number,
  windowMinutes: number,
): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowMinutes * 60_000);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(rateLimitEvents)
    .where(
      and(
        eq(rateLimitEvents.scope, scope),
        eq(rateLimitEvents.key, key),
        gt(rateLimitEvents.createdAt, windowStart),
      ),
    );

  await db.insert(rateLimitEvents).values({ scope, key });

  if (Math.random() < SWEEP_PROBABILITY) {
    // Best-effort: a failed sweep must never block a login or signup.
    try {
      await db
        .delete(rateLimitEvents)
        .where(
          lt(
            rateLimitEvents.createdAt,
            new Date(Date.now() - SWEEP_OLDER_THAN_MINUTES * 60_000),
          ),
        );
    } catch {
      // Ignored on purpose — see above.
    }
  }

  return count >= limit;
}
