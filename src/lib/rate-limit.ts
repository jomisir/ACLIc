import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimitEvents } from "@/db/schema";

/**
 * Returns true if `key` has exceeded `limit` events within `windowMinutes`
 * for the given `scope`. Records this attempt either way.
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

  return count >= limit;
}
