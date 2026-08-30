import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import type { NextRequest } from "next/server";

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  // /admin and /api live outside the locale-prefixed tree entirely — the
  // admin panel and machine routes are not translated content. /unsubscribe
  // lives under [locale] (see src/app/[locale]/unsubscribe/[token]) so it is
  // intentionally NOT excluded here — it needs locale negotiation like any
  // other public page.
  const response = intlMiddleware(request);

  // Page-view counting happens here rather than inside the pages because
  // most public routes are statically generated: a component inside them
  // would run once at build time, not once per visit. Middleware runs on
  // every request, cached or not.
  //
  // Fire-and-forget on purpose: the response is returned immediately and
  // never waits on the database, and recordPageView swallows its own
  // errors, so analytics can neither slow down nor break a page load.
  void trackView(request);

  return response;
}

async function trackView(request: NextRequest) {
  try {
    // Count only real page navigations.
    //
    // The Accept check is what actually does the work here. Next.js strips
    // `Next-Router-Prefetch` and `RSC` from inbound requests before
    // middleware runs (verified by logging the received headers), so those
    // two checks below can never fire on an external request — but client
    // router prefetches and RSC payload fetches don't ask for text/html in
    // the first place, so the Accept check excludes them anyway. The header
    // checks are kept as cheap belt-and-braces in case that behaviour
    // changes; they are not the thing keeping prefetches out of the counts.
    if (request.method !== "GET") return;
    if (request.headers.get("next-router-prefetch")) return;
    if (request.headers.get("rsc")) return;
    if (!request.headers.get("accept")?.includes("text/html")) return;

    const pathname = request.nextUrl.pathname;
    const locale = pathname.match(/^\/(en|am|om)(?=\/|$)/)?.[1] ?? routing.defaultLocale;

    // Imported lazily so the database client is only pulled into the
    // middleware bundle when a view is actually being recorded.
    const { recordPageView } = await import("./lib/analytics");
    await recordPageView(pathname, locale);
  } catch {
    // Never let analytics affect request handling.
  }
}

export const config = {
  matcher: [
    "/((?!api|admin|_next|_vercel|.*\\..*).*)",
  ],
};
