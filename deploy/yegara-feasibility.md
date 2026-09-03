# Yegara Premium (cPanel shared hosting) — feasibility report

Phase 0 only: audit, no code changed. Findings are organized by the four
questions asked. Everything below was checked directly against this repo's
code (grep + manual read), not assumed.

## 1. Where the app currently assumes self-hosted Postgres, a writable local filesystem, Docker, a root-managed process, or a non-HTTP outbound port

### Self-hosted Postgres / raw TCP wire protocol
- `src/db/index.ts` and `src/db/seed.ts` both use the `postgres` npm package
  (`postgres-js`) via `drizzle-orm/postgres-js`. This driver speaks the
  Postgres wire protocol over a **raw TCP socket on port 5432** (or whatever
  port `DATABASE_URL` specifies) — not HTTP. If Yegara firewalls outbound
  non-web ports (typical of budget shared hosting, to curb abuse), this
  fails **regardless of where the database itself lives** — moving Postgres
  to Neon doesn't help unless the driver also changes transport.
- `src/db/index.ts` keeps a **persistent connection pool** in a
  `global.__aclicDbClient` singleton (`postgres(connectionString, { max: 10 })`
  in production). This pooling model has no equivalent in an HTTP-per-request
  driver and will need to be removed, not adapted.
- `drizzle.config.ts` also uses the `postgres` dialect for `drizzle-kit`, but
  only for generating/running migrations — this only matters for whichever
  machine runs `db:migrate`, and your plan already keeps that off the shared
  host.

### Local filesystem writes
- **None found.** I grepped the entire `src/` tree for `fs.write*`,
  `createWriteStream`, `/tmp`, and `os.tmpdir()` — zero matches. Uploads go
  straight from an in-memory `Buffer` (from the request) through `sharp`
  (in-memory) to Supabase Storage (`src/lib/storage.ts`, `@supabase/supabase-js`,
  HTTPS). Nothing on the request path touches local disk.
- The **deploy tooling** (not the app) does assume a writable local path:
  `deploy/backup.sh` writes to `/var/backups/aclic`. This is being replaced
  per your Phase 3 plan (GitHub Actions backup), so it's not a runtime
  concern, just something to delete along with the other VPS-era scripts.

### Docker
- `Dockerfile` and `docker-compose.yml` exist as deploy artifacts only —
  nothing in `src/` depends on a container runtime. They're simply unusable
  on shared hosting (no Docker daemon, no root) and should be removed per
  your Phase 4 instruction, not adapted.

### Root-managed process
- `deploy/aclic.service` (systemd unit) requires root to install
  (`/etc/systemd/system/`, `systemctl enable`).
- `deploy/ecosystem.config.js` (PM2) assumes the ability to run `pm2 startup`
  (registers a root-level system service) and a long-lived daemon the app
  owner controls directly.
- Neither is usable under cPanel — cPanel's own "Setup Node.js App" feature
  (Phusion Passenger integration, present under both Apache and LiteSpeed)
  replaces both: it manages the Node process lifecycle itself under the
  account's own unprivileged user, no root and no PM2/systemd needed. This
  is a **replacement, not a port** — delete both files per Phase 4.

### Non-HTTP outbound ports, beyond Postgres
- **SMTP** (`src/lib/mail.ts`, nodemailer): defaults to port 587 (STARTTLS)
  or 465 (implicit TLS) — also not HTTP. Your Phase 3 plan points this at
  Yegara's own mail host, which is virtually always allowed outbound from
  the same account's Node app (it's the provider's own first-party mail
  service) — but this is an assumption, not something I can verify without
  access to the account. Worth a two-minute test after setup: send one
  confirmation email and confirm it isn't silently swallowed.
- **Supabase Storage** (`src/lib/storage.ts`, `@supabase/supabase-js`): pure
  HTTPS/REST, port 443 only. No concern.
- **Auth.js**: no outbound network calls at all (Credentials provider, JWT
  sessions, no external identity provider). No concern.

## 2. Will `sharp` resolve a prebuilt linux-x64 binary without a compile step?

Yes, with one caveat worth guarding against explicitly.

- Sharp 0.35.x ships prebuilt native binaries as regular npm
  `optionalDependencies` (`@img/sharp-linux-x64`, `@img/sharp-libvips-linux-x64`,
  etc.) — npm's own platform-matching selects the right one at `npm install`
  time. No compiler, no `node-gyp`, no build toolchain needed, **as long as
  the machine running `npm ci` is linux-x64 with glibc** (matching
  CloudLinux, which is RHEL-based/glibc — not musl). A standard
  `ubuntu-latest` GitHub Actions runner matches this profile, so building the
  deploy artifact in CI (as your plan specifies) and uploading the resulting
  `node_modules` alongside the standalone build is the right approach.
- **The caveat**: Next.js's `output: "standalone"` file tracing has a
  well-documented history of not reliably including sharp's native binary in
  the traced `node_modules` (Next.js's own docs have a dedicated
  "Sharp Missing In Production" error page for this). The fix is one line —
  add `outputFileTracingIncludes` to `next.config.ts` pointing at
  `node_modules/sharp/**/*` — but it needs to be added and verified, not
  assumed. I have **not** made this change yet (Phase 0 is audit-only); it
  should be the first thing done in Phase 2, and the CI-built artifact should
  be checked (e.g. `ls` the packaged `node_modules/@img/`) before trusting it.

## 3. Does any route need Node APIs unavailable under Passenger?

No unusual APIs found. Grepped for `child_process`, raw `net`/`tls` sockets,
and found none. Everything is standard Node (Buffers, `fetch`, `crypto`) or
goes through documented npm packages (`argon2`, `sharp`, `postgres`,
`@supabase/supabase-js`, `nodemailer`, `next-auth`). Passenger runs a normal
Node.js process — the constraint isn't which APIs are available, it's **how
the process is expected to bind to a port**, which is a Phase 2 concern, not
a Phase 0 blocker (see below).

## 4. Genuinely incompatible things, stated plainly

Nothing is fundamentally incompatible with this hosting target **provided one
assumption holds**, which I cannot verify without access to the account:

> **Yegara's cPanel Node.js Selector uses the "self-listening on `process.env.PORT`" model, not the legacy "`module.exports = app`" Express-adapter model.**

Some cPanel/Passenger documentation describes Node apps as needing to export
an Express `app` object (no `.listen()` call) for Passenger to mount
internally. Other documentation — and every published "deploy Next.js on
cPanel" guide I found — describes apps that call `.listen()` on
`process.env.PORT` themselves, which Passenger then proxies from 80/443.
**Next.js's generated `.next/standalone/server.js` is a self-listening HTTP
server** (it already reads `process.env.PORT`/`process.env.HOSTNAME`) — it
does not export an app object. This matches the second model, which is the
one your plan's `app.js` stub assumes, and is the model essentially all
"Next.js on cPanel" tutorials rely on. I believe this will work, but it is
the one thing in this whole plan I'd flag as **"verify before building
everything else on top of it"** rather than "confirmed compatible" — a
5-minute test (deploy a one-line `http.createServer` app as the Node app,
confirm it's reachable) would remove all doubt cheaply, before spending time
on the Neon migration or the CI pipeline.

Two more things worth flagging, not as blockers but as things to confirm with
Yegara support rather than discover after the fact:

- **Memory limits under CloudLinux's LVE.** A Next.js SSR process (even
  standalone) typically idles around 150–300MB RSS, more under load. Budget
  shared-hosting Node plans sometimes cap per-account memory well below
  that. Worth asking Yegara what the Node app memory limit is on the
  Premium plan before assuming this fits.
- **Node.js version availability.** The app was built and tested against
  Node 20; `package.json` doesn't currently pin an `engines` field (I'll add
  one in Phase 2). Most current cPanel installs offer Node 18/20/22 via the
  Node.js Selector, but worth confirming 20+ is actually available on this
  account.

## Incidental cleanup (not a blocker, noted for Phase 1)

`@auth/drizzle-adapter` is listed in `package.json` but never imported or
used anywhere in `src/` — the Auth.js setup uses JWT sessions with no
database adapter. Safe to remove as part of the dependency cleanup, since
it's also one less thing to worry about w.r.t. driver compatibility.

## Bottom line

Everything the plan proposes (Neon HTTP driver, Passenger `app.js` stub,
CI-built deploy artifact, Yegara mail host, GitHub Actions backups) is
sound and addresses a real constraint I independently confirmed in the
code — none of it is solving an imagined problem. The one open question is
the Passenger port-binding model above; everything else here is either
already fine (Supabase Storage, Auth.js, no filesystem writes, no unusual
Node APIs) or a known, one-line fix (`outputFileTracingIncludes` for sharp).

No transactions to restructure for Phase 1 either — I searched for
`.transaction(` calls across the whole app and found none; the seed script
and every admin server action already issue sequential single statements,
so the switch to `drizzle-orm/neon-http` needs no logic changes for
atomicity, just the driver/client swap itself.
