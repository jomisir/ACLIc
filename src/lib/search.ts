import { and, eq, ilike, or, asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { leaders, workItems, resources, pages } from "@/db/schema";
import type { Locale } from "@/i18n/routing";

export type SearchResult = {
  kind: "leader" | "work" | "resource" | "page";
  title: string;
  snippet: string | null;
  href: string;
};

const LIMIT_PER_KIND = 10;

/** Strips stored rich-text markup so snippets read as plain prose. */
function toPlain(html: string | null): string | null {
  if (!html) return null;
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text.length === 0 ? null : text;
}

function snippet(text: string | null, max = 180): string | null {
  const plain = toPlain(text);
  if (!plain) return null;
  return plain.length <= max ? plain : `${plain.slice(0, max).trimEnd()}…`;
}

/**
 * Searches published, publicly-visible content only.
 *
 * Every branch below filters on status === "published" (and visibility ===
 * "public" where that column exists). Draft leader profiles, internal work
 * items and internal resources must never surface here — search would
 * otherwise become a way around the publish workflow and the guardian
 * consent gate.
 */
export async function searchContent(query: string, locale: Locale): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  // ILIKE with escaped wildcards: a user typing "%" should search for a
  // literal percent sign, not match everything.
  const pattern = `%${q.replace(/([\\%_])/g, "\\$1")}%`;

  const localized = <T extends Record<string, unknown>>(row: T, base: string) => {
    const suffix = locale.charAt(0).toUpperCase() + locale.slice(1);
    return (row[`${base}${suffix}`] ?? row[`${base}En`]) as string | null;
  };

  const [leaderRows, workRows, resourceRows, pageRows] = await Promise.all([
    db
      .select()
      .from(leaders)
      .where(
        and(
          eq(leaders.status, "published"),
          or(
            ilike(leaders.fullName, pattern),
            ilike(leaders.roleTitleEn, pattern),
            ilike(leaders.roleTitleAm, pattern),
            ilike(leaders.roleTitleOm, pattern),
            ilike(leaders.bioEn, pattern),
            ilike(leaders.bioAm, pattern),
            ilike(leaders.bioOm, pattern),
          ),
        ),
      )
      .orderBy(asc(leaders.displayOrder))
      .limit(LIMIT_PER_KIND),

    db
      .select()
      .from(workItems)
      .where(
        and(
          eq(workItems.status, "published"),
          eq(workItems.visibility, "public"),
          or(
            ilike(workItems.titleEn, pattern),
            ilike(workItems.titleAm, pattern),
            ilike(workItems.titleOm, pattern),
            ilike(workItems.summaryEn, pattern),
            ilike(workItems.summaryAm, pattern),
            ilike(workItems.summaryOm, pattern),
          ),
        ),
      )
      .orderBy(desc(workItems.occurredOn))
      .limit(LIMIT_PER_KIND),

    db
      .select()
      .from(resources)
      .where(
        and(
          eq(resources.status, "published"),
          eq(resources.visibility, "public"),
          or(
            ilike(resources.titleEn, pattern),
            ilike(resources.titleAm, pattern),
            ilike(resources.titleOm, pattern),
          ),
        ),
      )
      .orderBy(desc(resources.createdAt))
      .limit(LIMIT_PER_KIND),

    db
      .select()
      .from(pages)
      .where(
        and(
          eq(pages.status, "published"),
          or(
            ilike(pages.titleEn, pattern),
            ilike(pages.titleAm, pattern),
            ilike(pages.titleOm, pattern),
            ilike(pages.bodyEn, pattern),
            ilike(pages.bodyAm, pattern),
            ilike(pages.bodyOm, pattern),
          ),
        ),
      )
      .limit(LIMIT_PER_KIND),
  ]);

  const results: SearchResult[] = [];

  for (const l of leaderRows) {
    results.push({
      kind: "leader",
      title: l.fullName || (localized(l, "roleTitle") ?? ""),
      snippet: snippet(localized(l, "bio")),
      href: "/leaders",
    });
  }

  for (const w of workRows) {
    results.push({
      kind: "work",
      title: localized(w, "title") ?? "",
      snippet: snippet(localized(w, "summary")),
      href: "/work",
    });
  }

  for (const r of resourceRows) {
    results.push({
      kind: "resource",
      title: localized(r, "title") ?? "",
      snippet: null,
      href: "/resources",
    });
  }

  for (const p of pageRows) {
    // "home" is served at the locale root, not /home.
    results.push({
      kind: "page",
      title: localized(p, "title") ?? p.slug,
      snippet: snippet(localized(p, "body")),
      href: p.slug === "home" ? "/" : `/${p.slug}`,
    });
  }

  // Note: search queries are deliberately NOT logged anywhere. On a site
  // whose visitors include children, a searchable record of what individuals
  // looked for is a safeguarding liability with no operational upside.
  return results.filter((r) => r.title.length > 0);
}
