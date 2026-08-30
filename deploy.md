# Deploying ACLIC to Yegara Premium (cPanel shared hosting)

This is the **only** deployment path for this project. The earlier VPS
artifacts (Dockerfile, docker-compose, nginx conf, systemd unit, PM2 config)
have been deleted so there is no second, contradictory story to follow.

Architecture on this host:

| Piece | Where it runs |
| --- | --- |
| Next.js app | cPanel "Setup Node.js App" (Phusion Passenger), started via `app.js` |
| Database | Neon (managed Postgres), reached over **HTTPS/443**, not 5432 |
| File storage | Supabase Storage (private bucket, HTTPS) |
| Build | GitHub Actions — **never** on the shared host |
| Migrations | Your machine or CI — **never** on the shared host |
| Backups | GitHub Actions, nightly |
| Mail | cPanel mailbox on the Yegara mail host, authenticated SMTP |

Read `deploy/yegara-feasibility.md` first if you want the reasoning behind
these choices, including the one open question about Passenger's port model.

---

## 0. Before anything else: verify the Passenger model (5 minutes)

`deploy/yegara-feasibility.md` flags one assumption worth testing before you
build anything on top of it: that Yegara's Node.js Selector runs a
**self-listening** app that binds `process.env.PORT` (what Next's standalone
server does), rather than expecting `module.exports = app`.

Create a throwaway Node app in cPanel with this as the startup file:

```js
const http = require("http");
http
  .createServer((_req, res) => res.end("ok"))
  .listen(process.env.PORT || 3000);
```

If the app's URL returns `ok`, the model is confirmed and everything below
works. If it does not, stop and raise it — that changes the approach, and it
is far cheaper to learn now.

## 1. Order hosting and point the domain

1. Order the Yegara Premium plan; note the nameservers in the welcome email.
2. At your domain registrar, set the nameservers to Yegara's, **or** keep your
   registrar's DNS and add an `A` record for `@` and `www` pointing at the
   account's IP (shown in cPanel → right sidebar → "Shared IP Address").
3. Wait for propagation. Check with `dig aclic.org +short` before continuing —
   AutoSSL in step 7 will fail if DNS has not resolved yet.

## 2. Create the Neon database

1. Sign up at [neon.tech](https://neon.tech) and create a project. Choose the
   region closest to your users; from Addis Ababa, an EU region (e.g.
   `eu-central-1`) is a reasonable pick, and matches the UK datacentre the
   site itself runs in.
2. Copy the **pooled** connection string from the Neon dashboard. It looks
   like:
   `postgresql://user:password@ep-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require`
3. That single string is your `DATABASE_URL` everywhere: the app, the GitHub
   Actions secrets, and your local `.env` when running migrations.

The app talks to Neon over HTTPS via `@neondatabase/serverless`, so it does
not matter whether the shared host allows outbound 5432 — but `pg_dump` and
`drizzle-kit` **do** use 5432, which is exactly why those run off-host.

## 3. Run migrations (from your machine, not the host)

```bash
git clone <this-repo> aclic && cd aclic
npm ci
cp .env.example .env        # fill in DATABASE_URL from step 2
npm run db:migrate          # creates all 13 tables
npm run db:seed             # first superuser + empty content rows
```

`db:seed` is idempotent — safe to re-run. It reads `ADMIN_EMAIL` and
`ADMIN_PASSWORD` from `.env` to create the first superuser, who is forced to
change their password on first login.

Re-run `npm run db:migrate` against the same `DATABASE_URL` whenever a
migration is added. Never attempt this from cPanel's terminal.

## 4. Set up Supabase Storage

1. Create a Supabase project (the free tier is sufficient).
2. Storage → New bucket → name it `aclic-media`, and leave it **private**.
   The app serves files through gated route handlers that check publication
   status, so the bucket must never be public.
3. From Project Settings → API, note the project URL and the `service_role`
   key. The `service_role` key is server-only — never expose it to the
   browser and never commit it.

## 5. Build the deploy artifact (GitHub Actions)

The shared host has no build toolchain and will likely OOM running
`next build`. Build in CI instead.

1. In the GitHub repo: Settings → Secrets and variables → Actions, add
   `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`.
   (The build needs database access because pages are statically generated
   from published content at build time.)
2. Actions → "Build deploy artifact (Yegara/cPanel)" → Run workflow.
3. Download `aclic-deploy.zip` from the finished run.

Its layout is exactly what the cPanel application root must contain:

```
app.js
.next/standalone/server.js
.next/standalone/node_modules/...
.next/standalone/.next/static/...
.next/standalone/public/...
```

## 6. Set up the Node.js app in cPanel

1. cPanel → **Setup Node.js App** → Create Application.
2. Fill in:
   - **Node.js version**: 20 or newer (`package.json` requires `>=20`).
   - **Application mode**: Production
   - **Application root**: `aclic` (creates `/home/<user>/aclic`)
   - **Application URL**: your domain
   - **Application startup file**: `app.js`
3. Click Create, then **Stop** the app while you upload files.
4. cPanel → File Manager → navigate to `/home/<user>/aclic` → Upload
   `aclic-deploy.zip` → right-click → Extract. Confirm `app.js` sits at the
   root of that folder, with `.next/` beside it.
5. Back in Setup Node.js App, add the environment variables (see next
   section), then **Start** the app.

Do **not** run `npm install` from the "Run NPM Install" button — the artifact
already contains the traced `node_modules`, and a fresh install on the host
risks both OOM and a missing `sharp` binary.

## 7. Environment variables

Add these in cPanel → Setup Node.js App → your app → **Environment
variables**. This is where they live in production; there is no
`.env.production` file on this host.

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection string (step 2) |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `NEXT_PUBLIC_SITE_URL` | `https://aclic.org` |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase `service_role` key |
| `SUPABASE_STORAGE_BUCKET` | `aclic-media` |
| `SMTP_HOST` | `mail.aclic.org` (step 9) |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | the full mailbox address |
| `SMTP_PASS` | that mailbox's password |
| `SMTP_FROM` | `ACLIC <no-reply@aclic.org>` |

Restart the app after changing any of them — Passenger does not pick up
changes live.

## 8. TLS (AutoSSL)

cPanel → **SSL/TLS Status** → select the domain and `www` → **Run AutoSSL**.
Let's Encrypt certificates are issued and renewed automatically. If issuance
fails, DNS has not propagated yet — recheck step 1.

Once TLS is live, confirm `https://aclic.org` loads and that `http://` is
redirected. Also confirm `https://aclic.org/admin` is reachable but
**not indexed** — the app sends `X-Robots-Tag: noindex` on `/admin/*` and
`robots.txt` disallows it.

## 9. Mailboxes and deliverability

1. cPanel → **Email Accounts** → Create → e.g. `no-reply@aclic.org`. Use a
   strong password; it becomes `SMTP_PASS`.
2. cPanel → **Email Deliverability** → for your domain:
   - Click **Manage**, then install the suggested **SPF** and **DKIM**
     records. cPanel generates both and can apply them for you if it manages
     your DNS. If DNS lives at your registrar, copy the records across
     manually.
3. **DMARC is not generated by cPanel — add it manually** as a TXT record:

   ```
   Name:  _dmarc.aclic.org
   Value: v=DMARC1; p=none; rua=mailto:dmarc@aclic.org; fo=1
   ```

   Start at `p=none` (monitor only). After a few weeks of clean reports,
   tighten to `p=quarantine` and then `p=reject`.
4. Send a real test: submit the newsletter form on the live site and confirm
   the confirmation email arrives and is not marked as spam. This also
   verifies outbound SMTP is not firewalled — the one service assumption
   `deploy/yegara-feasibility.md` could not confirm in advance.

## 10. Backups

Nightly backups run in GitHub Actions (`.github/workflows/backup.yml`,
02:00 UTC) using the same secrets from step 5. Each run keeps a 30-day
artifact containing a `pg_dump` of Neon plus a full copy of the storage
bucket.

Restore procedure — tested end to end — is in `deploy/restore.md`.

There is nothing to schedule in cPanel's cron for backups. If you do want a
cPanel cron job for something else, note that it runs on the shared host and
therefore cannot reach Postgres on 5432.

## 11. Redeploying after a change

1. Merge your change.
2. Run the "Build deploy artifact" workflow again; download the new zip.
3. If the change includes a migration, run `npm run db:migrate` from your
   machine **before** deploying the new code.
4. cPanel → Setup Node.js App → **Stop** the app.
5. File Manager → delete the old `app.js` and `.next/` from the application
   root, upload and extract the new zip.
6. **Start** the app, and load the site to confirm.

Keep the previous zip until the new one is confirmed working — rolling back
is just re-extracting the old artifact.
