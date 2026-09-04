# Deployment log

Running record of the ACLIC deployment to Yegara Premium (cPanel shared
hosting). Records what was attempted, what the **real** output was, and what
failed and why.

Entries are append-only. A step that failed stays in the log with its failure
recorded — that is more useful to the next person than a tidy summary.

**Legend:** ✅ verified against real infrastructure · ⏳ waiting on the account
holder · ❌ failed · ⬜ not started

---

## Session 1 — 30 August 2026

### Pre-flight (done locally, no credentials needed)

| Check | Result |
|---|---|
| Read `docs/handover-report.md`, `deploy.md`, `deploy/yegara-feasibility.md` in full | ✅ done |
| Re-verify no interactive transactions after the feature commits | ✅ see below |
| Neon region research for UK proximity | ✅ see below |
| Gate 0 test app builds and runs locally | ✅ see below |

#### Interactive transactions — re-verified

`docs/handover-report.md` §3 claims `.transaction(` appears nowhere. Re-checked
after the three feature commits (`f7b4994` added rich text, search and
analytics; 30 source files changed since the feasibility report).

```
grep -rn "\.transaction(" src/ scripts/
  → src/db/index.ts:15  (comment)
  → src/db/index.ts:17  (comment)
grep -rn "\.batch("     src/ scripts/   → none
grep -rni "'BEGIN'"     src/            → none (one comment only)
```

**Still true: no interactive transactions anywhere.** The only matches are
explanatory comments.

A grep alone is a weak check, so the multi-write sequences were audited
directly. Every admin action follows the same shape — *one domain write, then
one audit write* — rather than a multi-row unit of work. Two non-atomic seams
exist and are worth recording honestly:

1. **Domain write + audit write.** If the audit insert failed after the domain
   write succeeded, a change would go unlogged. Consequence: a gap in the audit
   trail, not corrupted data.
2. **`uploadImageSlot`** inserts a `media` row, then links it to an
   `image_slots` row. A failure between the two leaves an orphaned media row —
   visible and deletable in the media library. Not corruption.

Both seams pre-date the Neon migration; `postgres-js` did not wrap these in
transactions either, so **nothing regressed**. Neither justifies moving to the
WebSocket driver.

#### Neon region — decided

`deploy.md` §2 currently recommends `eu-central-1` and calls it a match for the
UK datacentre. **That is wrong** — `eu-central-1` is Frankfurt.

Neon has supported **AWS London (`aws-eu-west-2`)** since February 2025.
That is the correct choice: it is the same country as the Yegara datacentre, so
every runtime query is an in-country round trip, and it keeps the data in the
UK — which matters for a site holding minors' names and photographs.

`deploy.md` will be corrected in Phase 1.

#### Gate 0 test app — verified locally

`deploy/gate0-passenger-test/app.js` was run locally before being handed over:

```
$ PORT=4501 node app.js
$ curl http://127.0.0.1:4501/       → "ok"
$ curl http://127.0.0.1:4501/diag   → full JSON, all egress probes returned
```

Both files pass `node --check`. Zero dependencies, so no `npm install` is
needed on the host.

---

### Account facts supplied by the account holder

| Fact | Value |
|---|---|
| Domain | `aclic.org` |
| Node.js versions offered by the Node.js Selector | 20 available ✅ (satisfies `engines: >=20`) |
| DNS pointed at Yegara? | **No, not yet** |

The DNS answer changes the Gate 0 method. A subdomain would need DNS just as
much as the apex does, so it buys nothing here; and cPanel's temporary
`~username` URL sends a different `Host` header, which will not match the
domain's vhost and therefore may never reach the Passenger app at all.

Gate 0 will instead target a path on the real domain and bypass DNS at the
client end with `curl --resolve` (and a hosts entry for browser testing).
That exercises the true vhost and the true Passenger configuration, so the
result is meaningful rather than an artefact of the test setup.

Because DNS is unpointed, AutoSSL has not run, so Gate 0 runs over **HTTP**.
That is expected and does not affect what the test measures.

### GATE 0 — Passenger port binding

**Status: ⏳ waiting on the account holder.**

Blocking. Nothing downstream proceeds until this returns a result.

- Test package prepared: `deploy/gate0-passenger-test/`
- Exact cPanel field values supplied in chat
- Awaiting: the response body from the app URL, and the `/diag` JSON

Result will be recorded here verbatim.

---

### Blocked ON Gate 0 — client IP for rate limiting

⏳ **Must be fixed before the site is publicly reachable.**

`src/lib/client-ip.ts` trusts the leftmost `x-forwarded-for` entry, which the
client controls. Depending on how Yegara's LiteSpeed handles the header, that
means either an attacker can defeat the login rate limit entirely (fresh bucket
per request), or every visitor shares one bucket and five failed logins lock
out the whole admin panel.

The `/diag` result tells us which. What to look for in the JSON and in a manual
`curl -H 'X-Forwarded-For: 1.2.3.4'` against the app:

| Observation | Meaning | Fix |
|---|---|---|
| Header arrives with the real client IP appended after the injected one | Host appends; N proxies in front | Take the Nth entry from the right |
| Header arrives containing only the injected value | Host passes the client's header through untouched | Ignore `x-forwarded-for`; use a host-set header |
| Header absent entirely | No proxy header at all | Use the socket address, or a host-set header |

The derivation lives in one function so this is a one-line change.

### Phase 1 — Neon

✅ **Linked, and the policy question is settled.** Run by the account holder on
their own Windows machine; this session cannot reach Neon (see below).

| Fact | Value |
|---|---|
| Org ID | `org-old-scene-05112698` |
| Project ID | `orange-dew-89183792` |
| Branch | `production` (`br-dry-paper-b23i6f24`) |
| Neon CLI | v4.14.1 |
| `neon.ts` policy | `defineConfig({})`, committed |

**`neon config plan` output — the question that was blocking `neon deploy`:**

```
INFO: → Planning against branch production (br-dry-paper-b23i6f24)
INFO: No changes — branch production already matches the policy.
Utilized services: Postgres
```

Both concerns raised before this ran are now answered:

1. The empty `defineConfig({})` is a **no-op** against this branch. It does not
   remove anything. `neon deploy` is safe to run and will apply nothing.
2. The policy does **not** manage schema — it reports Postgres as a utilized
   service and proposes no changes. **drizzle-kit remains the single owner of
   the schema** (`drizzle/*.sql` via `npm run db:migrate`). No second source of
   truth was introduced.

**`neon link` wrote a real production connection string into `.env.local`**
(`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_BRANCH`). That file is
gitignored, so it cannot be committed — but it means a local `npm run dev` on
that machine now talks to the production branch. `npm run db:demo` refuses it,
by design, because it only accepts a local host.

**Not yet done on this branch:** `npm run db:migrate` (creates the tables) and
`npm run db:seed` (bootstrap superuser). Seed also needs `ADMIN_EMAIL` and
`ADMIN_PASSWORD`, which `neon link` does not supply.

**Still to keep separate:** the consent-gate test needs its own throwaway
project with dummy rows. It publishes and then revokes leader profiles, so it
must not run against `production`.

#### Two side commands that did not complete (neither blocks anything)

- `neon skills -y` — "No coding agents detected in this project." It installs
  agent tooling, not database configuration. `neon skills --agent claude-code`
  would target it explicitly.
- `neon mcp -y` — "This CLI credential cannot mint API keys. Organization and
  project-scoped keys cannot create other keys." The key in use is org- or
  project-scoped rather than personal. Also agent tooling, not infrastructure.

#### Why this session could not run any of it

The remote environment's network policy blocks Neon: the egress gateway answers
`403` to `CONNECT` for `console.neon.tech:443`, `oauth2.neon.tech:443` and
`track.neon.tech:443`. An API key does not help — the TLS tunnel is refused
before any request is authenticated.

### Phase 2 — CI
⬜ Not started. Blocked on repository secrets.

### Phase 3 — Deploy and smoke test
⬜ Not started.

### Phase 4 — Mail
⬜ Not started. Outbound SMTP still unproven.

### Phase 5 — Lighthouse
⬜ Not started. Requires a deployed site.
