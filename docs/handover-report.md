# ACLIC website — build and handover report

**Repository:** `jomisir/ACLIc` (formerly `jomisir/aclic`)
**Branches:** `claude/aclic-website-build-wopqow` (original build) →
`claude/yegara-cpanel-migration` (current, contains everything)
**Status:** feature-complete and building; **not yet deployed** — see
[§9 Not verified](#9-what-is-not-verified) and [§10 Before launch](#10-before-launch)
**Report date:** 30 August 2026

---

## 1. What this is

The public website for **ACLIC — Addis Child-Led Initiatives Coalition**, a
child-led coalition in Addis Ababa hosted by the Organization for Social
Development (OSD), working alongside Save the Children.

The site has two jobs, in order: establish credibility with ministries, UN
bodies and donors; and recruit new member structures. Every decision below was
checked against those two.

**Scale:** 13 public pages × 3 languages, 17 admin screens, 13 server actions,
6 API route handlers, 14 database tables, 143 translated message keys per
locale.

---

## 2. Current state

| Area | State |
|---|---|
| Public site (13 pages × en/am/om) | Built |
| Admin panel with draft/publish workflow | Built |
| RBAC, audit log, guardian-consent gate | Built and verified |
| Trilingual content + UI | Built, 143 keys × 3, CI-checked |
| Rich text editing | Built and verified |
| Site-wide search | Built and verified |
| Privacy-friendly analytics | Built and verified |
| cPanel/Yegara deployment path | Built, **not yet run against real infrastructure** |
| Content (mission, vision, bylaws, reports) | **Intentionally empty** — see §7 |

---

## 3. Architecture

| Layer | Choice |
|---|---|
| Framework | Next.js 15, App Router, TypeScript, React Server Components |
| Styling | Tailwind CSS v4, design tokens via `@theme` |
| Database | Postgres on **Neon**, reached over **HTTPS/443** |
| ORM | Drizzle ORM + drizzle-kit |
| Auth | Auth.js v5, Credentials provider, JWT sessions, argon2 |
| Storage | Supabase Storage (private bucket) |
| Images | `next/image` + sharp, WebP, EXIF stripped |
| i18n | next-intl, locale-prefixed routing |
| Editor | Tiptap (admin only) |
| Sanitization | sanitize-html |
| Hosting | cPanel shared hosting (Yegara Premium), Passenger |
| Build & backups | GitHub Actions |

**Production dependencies (17):** `@neondatabase/serverless`,
`@supabase/supabase-js`, `@tiptap/*` (4), `argon2`, `drizzle-orm`, `next`,
`next-auth`, `next-intl`, `nodemailer`, `react`, `react-dom`, `sanitize-html`,
`sharp`, `zod`.

### The one architectural decision that drove everything else

The organization moved from a self-managed VPS to **cPanel shared hosting**.
That host may firewall outbound non-web ports, and the original Postgres driver
(`postgres-js`) speaks the Postgres wire protocol over **raw TCP/5432** — which
would fail regardless of where the database itself lived. The runtime therefore
uses Neon's **HTTP driver**, which tunnels Postgres over HTTPS/443.

Consequences, all deliberate:

- **Migrations and backups still use TCP** and run from a developer machine or
  CI, never on the shared host.
- **No connection pool** — each query is a stateless HTTPS request.
- **No interactive transactions.** This required *no* application changes: a
  search for `.transaction(` across the codebase returns nothing. Every admin
  action and the seed script already issued sequential single statements.

---

## 4. Public site

Thirteen pages per locale: Home, Our Story, Governance & Structure, Our
Leaders, What We Do, Partners, Join ACLIC, Reports & Resources, Contact,
Privacy, Safeguarding, Search, plus `/unsubscribe/[token]`.

**Signature element — the structure diagram.** A hand-built inline SVG showing
the full governance chain (General Assembly → President → 2 Vice Presidents +
Secretary → 13 Department Heads), with separate desktop and mobile layouts,
gold hairline connectors that draw in once, and focusable nodes. It is the
argument the site is making: a complete, formal governance structure in which
every seat is held by someone under eighteen.

**Public pages ship no client JavaScript.** Everything is a Server Component
except four small islands (theme toggle, language switcher, mobile nav,
newsletter form). Public-page JS is ~103–109 kB — that figure is the React 19 +
Next.js 15 App Router runtime floor, not application code; per-page JS is under
1.4 kB everywhere. The Tiptap editor lands only on admin routes (~230 kB) and
adds nothing to the public bundle.

---

## 5. Admin panel

Behind `/admin`, `noindex`, no public login link anywhere on the site.

**Two roles.** Editors create and edit drafts. Superusers additionally publish,
delete, export subscribers, manage users and settings, and record guardian
consent.

**Roles are enforced in the server actions themselves**, not only in
middleware — a server action is an independently callable endpoint, so hiding a
button is not access control. `requireRole()` appears in all 13 action modules.

Screens: dashboard, analytics, pages, leaders, partners, what-we-do, resources,
media library, newsletter, settings, users, audit log.

**Everything with a translated column is editable in all three languages.**
Pages, leader profiles, media alt text, settings, work items and resources all
present an English / Amharic / Afaan Oromoo tab set, and every one of those
records has an edit screen — a typo never needs a delete-and-recreate.

The tabs keep all three locales mounted and merely hide the inactive ones, so a
single plain `<form>` submits every language at once. That has one consequence
worth knowing when editing these screens: a `required` attribute must never go
on a field inside a tab panel. A browser cannot focus a hidden invalid control,
so it silently refuses to submit and shows the editor nothing. Required fields
are enforced in the server action instead — see `uploadResource`.

---

## 6. The three most recent features

### Rich text editor

Tiptap WYSIWYG replacing plain textareas for page bodies, leader biographies,
mission/vision and work-item summaries. Bold, italic, H2–H4, lists,
blockquote, links.

Because content is now stored as HTML, it is sanitized against a tight
allowlist **both on write and on render**. The second pass is deliberate: rows
written before sanitizing existed, or by any future code path that forgets,
still cannot inject script into a public page. Outbound links get
`rel="noopener noreferrer"`.

Short fields (names, titles, URLs, contact details) use a plain-text sanitizer
that strips markup entirely — a `<script>` in the "contact phone" field should
never survive.

### Site-wide search

`/[locale]/search`, a plain GET form — works with JavaScript disabled, and
results are linkable and shareable. Searches published leaders, work items,
resources and pages across all three languages.

Every query branch filters on `status = published`, and on `visibility =
public` where that column exists. Search must not become a way around the
publish workflow or the guardian-consent gate. ILIKE wildcards are escaped, so
typing `%` searches for a percent sign rather than matching everything.

**Search terms are not logged anywhere.** On a site whose visitors include
children, a searchable record of what individuals looked for is a safeguarding
liability with no operational upside.

### Analytics

A `page_views` table storing **daily aggregate counts only**, keyed by
`(day, path, locale)`. No IP address, user agent, cookie or session — the data
cannot identify a visitor even in principle.

The honest trade: this reports **page views, not unique visitors**. The
dashboard states that plainly rather than implying precision it does not have.

Counting happens in **middleware**, not in the pages. Most public routes are
statically generated, so a component inside them would have recorded one view
at build time rather than one per visit. This costs middleware bundle size
(46 kB → 115 kB) and is the correct trade for accurate counts.

Charts are single-series throughout, so there is no categorical palette and no
legend; every bar is directly labelled and the same figures appear in a table.
The brand gold measured **2.35:1** against the admin surface — below the 3:1
threshold — so the darker gold is used for marks, and the labels and table are
required relief rather than decoration.

---

## 7. Content is intentionally empty

Per the original brief's confidentiality rule, **no program detail, campaign,
report, statistic, quotation or mission wording was invented.** Verified by
grep across the codebase and seed data.

Empty by design, ready for the organization to fill from `/admin`:

- Mission and vision statements (stored as `null`, not placeholder prose)
- Bylaws summary
- All work items — the categories exist, the contents do not
- All reports and resources
- 17 leader profiles (names, photos, biographies)
- 13 partner placeholder slots, hidden from public view until filled
- Contact details, social links, membership application URL

The only factual content written into the site is what the brief supplied:
founding in August 2025 with OSD, 50+ founding member structures, the
governance structure, OSD as host organization, Save the Children as parent
organization, and the submissions to the United Nations.

---

## 8. Safeguarding and security

The leadership are all minors and the parent organizations have safeguarding
obligations. These controls are what make a public leaders page defensible.

| Control | Implementation |
|---|---|
| Guardian consent gate | A leader profile **cannot be published** without recorded consent — enforced in the server action, not the UI. Superuser only. |
| No identifying fields | Date of birth, age, school, neighbourhood, phone, personal email and social handles **do not exist in the schema at all** |
| EXIF stripping | Every uploaded image passes through sharp, which drops metadata including GPS; capped at 800px |
| Gated file serving | Photos, logos, media and resources are served through route handlers that check publication status; nothing sits behind a public bucket URL |
| One-click unpublish | Takes a profile down immediately without deleting the record |
| Analytics | Daily aggregates only, no per-visitor data |
| Search | No query logging |
| Passwords | argon2, 12-character minimum, forced change on first login |
| Sessions | 12-hour idle expiry; HttpOnly, SameSite=Strict, Secure |
| Rate limiting | Postgres-backed, 5 attempts / 15 min / IP on login and newsletter |
| Audit log | Actor, action, object, IP and timestamp on every create/update/publish/delete |
| Admin indexing | `X-Robots-Tag: noindex` plus `robots.txt` exclusion |

---

## 9. What is not verified

Stated plainly, because these are the things most likely to bite on first
deploy.

1. **The app has never run against real Neon infrastructure.** All database
   testing used a local shim implementing Neon's SQL-over-HTTP protocol,
   derived by reading the client source. It confirmed correct results, correct
   type mapping and working parameter binding — but it is not Neon. Connection
   string format and behaviour under load will surface on first deploy.

2. **The Passenger port-binding model is unconfirmed.** Next's standalone
   server binds `process.env.PORT` itself; some cPanel documentation describes
   an older `module.exports = app` convention instead. `deploy.md` opens with a
   five-minute throwaway test for this. **Do that test first** — it changes the
   approach if it fails.

3. **Outbound SMTP from the shared host is assumed, not proven.** `deploy.md`
   step 9 includes a real send test.

4. **The GitHub Actions workflows have never executed.** They need repository
   secrets configured first.

5. **Amharic and Afaan Oromo translations were written by an AI, not a native
   speaker.** Terminology was cross-checked against real institutional usage
   and corrected twice, but this needs a native-speaker review before launch.

6. **No Lighthouse run.** The brief targets performance 95+ and accessibility
   100. The build is structured for it (server-rendered, minimal JS, semantic
   markup, focus rings, skip link, alt text), but the score is unmeasured.

### What *has* been verified

- Full production build succeeds through the real Neon HTTP driver
- Deploy artifact assembled and booted via `app.js` with an injected `PORT`,
  exactly as Passenger would
- Smoke-tested `/`, `/en`, `/am`, `/om`, `/en/leaders`, `/admin/login`,
  `/sitemap.xml`, all three search locales, and the gated analytics route
- Search correctly excludes seeded draft and internal content
- Sanitizer blocks 11 XSS vectors (script tags, `img`/`svg` onerror,
  `javascript:` and `data:` URLs, inline handlers, iframe, form, style) while
  preserving legitimate formatting
- EXIF stripping confirmed with `exiftool` on a GPS-tagged test image
- `pg_dump` → `pg_restore` round trip run and row counts checked
- Message files: 143 keys × 3 locales, no drift, all valid ICU
- `sharp`'s native binary confirmed present in the built artifact
- Migrations applied and seed script run against a real Postgres instance
- Trilingual admin editing driven end to end in a real browser against the
  built server: a work item created with English, Amharic and Afaan Oromoo
  title and summary, reopened through its edit screen with all six fields
  prefilled, amended, published, and then confirmed rendering the correct
  language on `/en/work`, `/am/work` and `/om/work` and matching in search.
  The same round trip was run for a resource's three titles. Audit rows were
  written for both updates.

---

## 10. Before launch

Ordered by what blocks what.

1. **Test the Passenger model** (`deploy.md` §0). Five minutes. Everything else
   assumes it.
2. **Create the Neon project** and run migrations from a developer machine.
3. **Configure GitHub Actions secrets**, then run the build workflow once.
4. **Deploy the artifact** and confirm the site loads over AutoSSL.
5. **Send a real test email** to prove outbound SMTP works.
6. **Add SPF, DKIM and DMARC.** cPanel generates the first two under Email
   Deliverability; DMARC is manual — start at `p=none`.
7. **Have a native speaker review** the Amharic and Afaan Oromo copy.
8. **Clear `/privacy` and `/safeguarding` wording with OSD and Save the
   Children** before publishing them — both organizations have existing
   policies this site should be consistent with.
9. **Record guardian consent** for each leader profile before publishing any of
   the 17 slots.
10. **Fill in the empty content** from `/admin`.
11. **Run Lighthouse** and address anything below target.

---

## 11. Decisions the organization should review

1. **Mission and vision are superuser-only settings**, not editor-editable
   drafts, on the grounds that they are official wording. Confirm that split is
   right.
2. **Analytics reports page views, not unique visitors.** This is a deliberate
   privacy choice. If the organization needs unique-visitor figures for a
   donor report, that requires a different design and a different privacy
   posture — worth deciding now rather than later.
3. **Editors can edit leader biographies as drafts**, but only superusers can
   record consent and publish. Confirm editors should have that reach.
4. **Public-page JavaScript is ~103 kB**, above the brief's 90 kB target. This
   is the framework floor for the mandated stack, not application code.
   Meeting 90 kB would mean changing framework.
5. **Image-slot captions are English-only** in the admin UI, unlike the
   three-tab pattern used everywhere else. A small scope cut; easy to extend.
6. **Backups live as GitHub Actions artifacts** with 30-day retention. If the
   organization needs longer retention or off-GitHub copies, that should be
   added.

---

## 12. Repository guide

```
src/app/[locale]/      Public site (en/am/om, locale-prefixed)
src/app/admin/         Admin panel (Auth.js-gated, noindex)
src/app/api/           Auth, gated media/resource downloads, newsletter confirm
src/actions/           Server actions — every mutation, each with requireRole()
src/auth/              Auth.js config, RBAC helper, audit logging
src/db/                Drizzle schema, migrations, seed script
src/lib/               Sanitization, search, analytics, storage, mail, rate limiting
src/components/        Public server components + admin/ UI
messages/              next-intl strings, one JSON file per locale
scripts/               check-messages.mjs — message file validation
docs/                  This report
deploy/                Feasibility report, restore procedure
deploy.md              The single cPanel runbook
.github/workflows/     Build artifact, nightly backup
```

**Key documents:**

- `deploy.md` — the only deployment path. Follow it start to finish.
- `deploy/yegara-feasibility.md` — why the hosting setup is what it is, and the
  open questions.
- `deploy/restore.md` — tested restore procedure.
- `README.md` — local setup, environment variables, adding a language string.

**Useful commands:**

```bash
npm run dev              # local development
npm run check:messages   # validate translation files (also runs in CI)
npm run typecheck
npm run lint
npm run build
npm run db:generate      # after changing src/db/schema.ts
npm run db:migrate       # from your machine — never on the shared host
npm run db:seed          # idempotent; creates the first superuser
```

---

## 13. Commit history

| Commit | Contents |
|---|---|
| `74a7700` | Initial build — full site, admin panel, safeguarding, i18n, deployment |
| `8ea4c80` | i18n bug fixes (root-layout `notFound()`, per-page hreflang) and translation corrections |
| `e9212f8` | Phase 0 — Yegara/cPanel feasibility report (no code changes) |
| `a722fd0` | Phases 1–2 — Neon HTTP driver, Passenger runtime, CI build |
| `198b81e` | Phases 3–4 — mail, backups, artifact cleanup, cPanel runbook |
| `f7b4994` | Rich text editing, site search, analytics, translation pass |
