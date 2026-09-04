# ACLIC website

The public website for the **Addis Child-Led Initiatives Coalition (ACLIC)**. Next.js 15
(App Router, TypeScript), Tailwind CSS v4, Drizzle ORM over Postgres, Auth.js v5 for the
admin panel, next-intl for English / Amharic / Afaan Oromoo, and Supabase Storage for
uploads.

Deployed to **cPanel shared hosting** (Yegara Premium) with the database on **Neon**
and builds produced by **GitHub Actions** — see `deploy.md` for the full runbook and
`deploy/yegara-feasibility.md` for why it is set up this way.

## Running it locally

The app talks to Postgres through Neon's **HTTP** driver — it does not open a
socket to port 5432, it POSTs SQL over HTTPS. So a `DATABASE_URL` pointing at
your own `localhost:5432` cannot work on its own: the driver tries HTTPS against
localhost and fails with `ECONNREFUSED ... :443`. Pick one of the two paths
below.

### Path A — free Neon project (simplest)

Nothing extra to run. Create a free project at neon.tech, copy the pooled
connection string, and:

```bash
cp .env.example .env.local     # paste the Neon string into DATABASE_URL
npm install
npm run db:migrate             # create the tables
npm run db:seed                # bootstrap superuser + empty content rows
npm run dev
```

### Path B — local Postgres, no account, works offline

Uses `scripts/neon-http-proxy.mjs`, which speaks the same SQL-over-HTTP protocol
the Neon client expects and forwards to a plain local Postgres.

```bash
createdb aclic

cp .env.example .env.local
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/aclic
# NEON_FETCH_ENDPOINT=http://127.0.0.1:5599/sql     <- uncomment this line

npm install
npm run db:migrate
npm run db:seed

npm run dev:db-proxy           # terminal 1 — leave running
npm run dev                    # terminal 2
```

`NEON_FETCH_ENDPOINT` is what redirects the driver at the proxy. **Leave it
unset in production**, where unset means the real Neon endpoint.

### Then

Open http://localhost:3000 — it redirects to `/en`. Admin panel at
http://localhost:3000/admin/login, using `ADMIN_EMAIL` / `ADMIN_PASSWORD` from
your `.env.local`. The first sign-in forces a password change, after which you
are signed out and sign in again with the new one.

### Sample content for a demo

`db:seed` deliberately leaves the site empty — none of ACLIC's real wording is
confirmed, so nothing is invented. That makes for a blank demo, so:

```bash
npm run db:demo
```

fills every page, all three languages, the thirteen departments, work items,
resources and partners with throwaway text. Every string starts with `SAMPLE`
and the leadership slots are "Sample Leader 1..17" — nothing here can be
mistaken for approved wording, and no invented name, biography or photograph of
a real child is created even as test data. It refuses to run against anything
but a local database.

To get back to a clean empty site: drop the database, `db:migrate`, `db:seed`.

### Uploads without Supabase

Photos, logos and report files normally go to a private Supabase bucket. If
`SUPABASE_URL` is empty, development mode writes them to `.local-storage/`
instead (gitignored), so the media library, image slots and gated file serving
all work with nothing extra installed. This fallback is **development only** —
in production, missing Supabase credentials still throw, because a
misconfigured deployment must fail loudly rather than quietly write files onto
a shared host's disk.

## Environment variables

See `.env.example` for the full list. The important ones:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection string (see `deploy.md` step 2), or a local one when using the proxy |
| `NEON_FETCH_ENDPOINT` | **Development only.** Points the Neon driver at the local proxy. Unset in production. |
| `AUTH_SECRET` | Session signing secret — generate with `openssl rand -base64 32` |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL, used in metadata, sitemap, and email links |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Used once by `db:seed` to create the first superuser |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_STORAGE_BUCKET` | Private storage bucket for photos, logos, and report files |
| `SMTP_*` | Outgoing mail for newsletter double opt-in confirmations |

## Creating an admin user

The first superuser comes from `ADMIN_EMAIL` / `ADMIN_PASSWORD` via `npm run db:seed`, run
from your own machine against the remote database (it's idempotent — safe to re-run). To
create additional accounts afterwards, sign in as a superuser and use **Admin → Users** — it
generates a one-time temporary password that the account must change on first login.

## Adding a UI language string

1. Add the key to `messages/en.json`, and the same key with translations in
   `messages/am.json` and `messages/om.json`. Keep the same nesting/namespace across all
   three files — a missing key falls back to English at runtime but should still be filled
   in when the translation is ready.
2. Use it in a Server Component with `getTranslations({ locale, namespace })`, or pass the
   translated string as a prop into a Client Component (client components deliberately don't
   call `useTranslations` directly in this codebase — see `src/components/Header.tsx` for the
   pattern — to keep the public-page client bundle small).
3. Translatable **content** (page bodies, leader bios, work items, partner names, settings)
   lives in the database with `_en`/`_am`/`_om` columns instead — edit it from `/admin`, not
   from the message files.

## Running migrations against production

```bash
# From a machine that can reach the production DATABASE_URL:
DATABASE_URL=<production-url> npm run db:migrate
```

`drizzle-kit migrate` applies any SQL files under `drizzle/` that haven't been applied yet,
tracked in a `__drizzle_migrations` table. Generate new migration files locally with
`npm run db:generate` after changing `src/db/schema.ts`, commit them, then run `db:migrate`
against production as part of the deploy (see `deploy.md`).

**Migrations never run on the shared host.** `drizzle-kit` connects to Postgres on port 5432,
which the shared host may not allow outbound; the app itself avoids this by using Neon's
HTTP driver. Run migrations from your own machine or CI only.

## Project structure

```
src/app/[locale]/     Public site (English/Amharic/Afaan Oromoo, locale-prefixed)
src/app/admin/        Admin panel (Auth.js-gated, noindex)
src/app/api/          Route handlers: auth, gated media/resource downloads, newsletter confirm
src/actions/          Server actions (all mutations go through these, with requireRole() checks)
src/auth/             Auth.js config, RBAC helper, audit logging
src/db/               Drizzle schema, migrations, seed script
src/components/       Server components (public site) + admin/ (admin-only UI)
messages/             next-intl UI strings, one JSON file per locale
```

## Notes for the organization

- **Mission and vision statements, and the coalition's bylaws, are intentionally empty** in
  the seed data. Fill them in from `/admin → Settings` once the official wording is confirmed.
- **No past program, campaign, or report detail was invented** for this build — `/work` and
  `/resources` are wired up and empty by design, ready for content to be added from `/admin`.
- **Leader profiles cannot be published without guardian consent**, recorded by a superuser
  from each leader's edit page. Do this before publishing any of the 17 leader slots.
- Recommend clearing the wording of `/privacy` and `/safeguarding` with OSD and Save the
  Children before launch, since both have existing safeguarding policies this site should be
  consistent with.
