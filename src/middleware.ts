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
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!api|admin|_next|_vercel|.*\\..*).*)",
  ],
};
