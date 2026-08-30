import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import type { NextRequest } from "next/server";

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  // /admin, /api, /unsubscribe live outside the locale-prefixed tree entirely —
  // the admin panel and machine routes are not translated content.
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!api|admin|unsubscribe|_next|_vercel|.*\\..*).*)",
  ],
};
