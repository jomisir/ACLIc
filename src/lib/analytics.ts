import "server-only";
import { desc, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { pageViews } from "@/db/schema";
import { locales, type Locale } from "@/i18n/routing";

/**
 * How often a page view also triggers a retention sweep. Shared hosting gives
 * us no cron hook, so the sweep piggybacks on ordinary traffic — the same
 * approach `src/lib/rate-limit.ts` takes for its own expired rows. One in a
 * thousand views is frequent enough to keep the table bounded and rare enough
 * to cost nothing noticeable.
 */
const SWEEP_PROBABILITY = 0.001;

/**
 * Records one page view as a daily aggregate increment.
 *
 * Privacy: nothing identifying is stored — no IP, user agent, cookie or
 * session. The row is (day, path, locale) and a counter, so the data cannot
 * be traced back to a person even in principle. This is the deliberate
 * design; see the note on the pageViews table in src/db/schema.ts.
 *
 * Never throws: analytics must not be able to break a page render.
 */
export async function recordPageView(rawPath: string, locale: string) {
  try {
    if (!locales.includes(locale as Locale)) return;

    const path = normalizePath(rawPath);
    if (!path) return;

    const day = new Date().toISOString().slice(0, 10);

    await db
      .insert(pageViews)
      .values({ day, path, locale: locale as Locale, count: 1 })
      .onConflictDoUpdate({
        target: [pageViews.day, pageViews.path, pageViews.locale],
        set: { count: sql`${pageViews.count} + 1` },
      });

    if (Math.random() < SWEEP_PROBABILITY) {
      await pruneOldAnalytics();
    }
  } catch {
    // Swallowed on purpose — see above.
  }
}

/**
 * Strips the locale prefix and normalizes, so /en/leaders and /am/leaders
 * aggregate under the same "/leaders" path (the locale is its own column).
 * Returns null for anything that isn't a known public page, which keeps
 * junk and probe traffic out of the table.
 */
const TRACKED_PATHS = new Set([
  "/",
  "/about",
  "/structure",
  "/leaders",
  "/work",
  "/partners",
  "/membership",
  "/resources",
  "/contact",
  "/privacy",
  "/safeguarding",
  "/search",
]);

export function normalizePath(rawPath: string): string | null {
  const withoutLocale = rawPath.replace(/^\/(en|am|om)(?=\/|$)/, "") || "/";
  const clean = withoutLocale.split("?")[0].replace(/\/+$/, "") || "/";
  return TRACKED_PATHS.has(clean) ? clean : null;
}

export type ViewsSummary = {
  totalViews: number;
  byPath: { path: string; count: number }[];
  byLocale: { locale: string; count: number }[];
  daily: { day: string; count: number }[];
};

/** Aggregates for the admin dashboard, over the last `days` days. */
export async function getViewsSummary(days = 30): Promise<ViewsSummary> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [byPath, byLocale, daily] = await Promise.all([
    db
      .select({ path: pageViews.path, count: sql<number>`sum(${pageViews.count})::int` })
      .from(pageViews)
      .where(gte(pageViews.day, since))
      .groupBy(pageViews.path)
      .orderBy(desc(sql`sum(${pageViews.count})`)),

    db
      .select({ locale: pageViews.locale, count: sql<number>`sum(${pageViews.count})::int` })
      .from(pageViews)
      .where(gte(pageViews.day, since))
      .groupBy(pageViews.locale)
      .orderBy(desc(sql`sum(${pageViews.count})`)),

    db
      .select({ day: pageViews.day, count: sql<number>`sum(${pageViews.count})::int` })
      .from(pageViews)
      .where(gte(pageViews.day, since))
      .groupBy(pageViews.day)
      .orderBy(pageViews.day),
  ]);

  return {
    totalViews: byPath.reduce((sum, r) => sum + r.count, 0),
    byPath,
    byLocale,
    daily,
  };
}

/** Newsletter growth over the same window, for the dashboard chart. */
export async function getSubscriberGrowth(days = 30) {
  const { subscribers } = await import("@/db/schema");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      day: sql<string>`to_char(${subscribers.createdAt}, 'YYYY-MM-DD')`,
      total: sql<number>`count(*)::int`,
      confirmed: sql<number>`count(*) filter (where ${subscribers.confirmedAt} is not null)::int`,
    })
    .from(subscribers)
    .where(gte(subscribers.createdAt, since))
    .groupBy(sql`to_char(${subscribers.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${subscribers.createdAt}, 'YYYY-MM-DD')`);

  return rows;
}

/** Retention window for analytics rows. */
export const ANALYTICS_RETENTION_DAYS = 400;

export async function pruneOldAnalytics() {
  const cutoff = new Date(Date.now() - ANALYTICS_RETENTION_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  await db.delete(pageViews).where(lt(pageViews.day, cutoff));
}
