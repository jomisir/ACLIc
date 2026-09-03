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
⬜ Not started. Blocked on Gate 0 and on the connection string.

Note for when this happens: use a **separate throwaway Neon project** for the
consent-gate test, not a branch of the production database — a branch would
carry real leader data. A throwaway connection string is safe to share; a
production one is a credential with every child's record behind it.

### Phase 2 — CI
⬜ Not started. Blocked on repository secrets.

### Phase 3 — Deploy and smoke test
⬜ Not started.

### Phase 4 — Mail
⬜ Not started. Outbound SMTP still unproven.

### Phase 5 — Lighthouse
⬜ Not started. Requires a deployed site.
