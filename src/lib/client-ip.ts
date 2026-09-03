/**
 * The single place the client IP is derived. Used for login and newsletter
 * rate limiting, and for the IP recorded on audit rows.
 *
 * ⚠ UNRESOLVED — must be revisited before the site is publicly reachable.
 *
 * `x-forwarded-for` is a chain, and the leftmost entry is whatever the *client*
 * sent. Trusting it has two failure modes, and which one applies depends on the
 * host, which is why this cannot be settled from here:
 *
 *   1. If the host appends to an existing header rather than replacing it, an
 *      attacker sends `X-Forwarded-For: <random>` on every request, lands in a
 *      fresh rate-limit bucket each time, and the 5-per-15-minutes login limit
 *      stops limiting anything.
 *
 *   2. If the host sets no such header at all, every visitor resolves to
 *      "unknown" and shares one bucket. Five failed logins from anywhere then
 *      lock every administrator out of the panel for fifteen minutes — a
 *      trivial denial of service against the whole organization.
 *
 * The correct parse depends on how many proxies sit in front of the app: with
 * a known proxy count N, take the Nth entry from the RIGHT (the last hop the
 * client could not forge), or use a header the host sets itself and the client
 * cannot spoof. Gate 0's diagnostic is what tells us which. See
 * `deploy/deployment-log.md` and §9 of `docs/handover-report.md`.
 *
 * Nothing is deployed yet, so there is no exposure today. Do not treat this as
 * a working control until it has been fixed and tested against the real host.
 */
export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
