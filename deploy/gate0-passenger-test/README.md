# Gate 0 — Passenger port-binding test

**Throwaway diagnostic. Delete the cPanel application and this folder once the
result is recorded in `deploy/deployment-log.md`.**

## What this answers

The blocking question from `deploy/yegara-feasibility.md` §4 and
`docs/handover-report.md` §9.2:

> Does this host run a **self-listening** Node app that binds
> `process.env.PORT` (the model Next.js's standalone server uses), or does it
> expect the older `module.exports = app` convention?

Everything downstream — `app.js`, the CI artifact layout, the whole deploy
runbook — assumes the first. This test settles it before any of that is built
on top.

It also answers, in the same deploy, three things the feasibility report could
only flag as assumptions:

- the **Node version** actually running,
- the **memory ceiling** under CloudLinux's LVE,
- and critically, whether the host permits **outbound HTTPS on 443** — which
  the entire Neon database plan depends on.

## Files

| File | Use |
|---|---|
| `app.js` | The test. Try this first. |
| `app-modelb.js` | Fallback. Only if `app.js` returns nothing at all. |

Both are pure Node standard library — no `npm install`, no dependencies.

## Steps

1. In cPanel → **Setup Node.js App** → **Create Application**, using the field
   values given in the chat (application root, URL, startup file, Node
   version).
2. Upload `app.js` (and `app-modelb.js`) into the application root.
3. **Start** the app.
4. Open the application URL in a browser.

## Interpreting the result

| What you see | Meaning | Next step |
|---|---|---|
| `ok` | **Gate 0 PASSES.** Self-listening model confirmed. | Open `/diag` on the same URL and paste the JSON back. |
| Nothing / 503 / "Application failed to start" | `app.js` model not supported. | Change the startup file to `app-modelb.js`, restart, reload. |
| `model-b` after the fallback | Host uses the Express-adapter model. | **Stop and report.** This changes the approach — see below. |
| Neither works | Something else is wrong. | Send the Passenger log (path in the Node.js App screen). |

## If Model B is the answer

Do not work around it silently. Next.js's `.next/standalone/server.js` calls
`.listen()` internally and exports nothing, so it cannot be mounted by a
Passenger that expects an exported handler. Report the result and the cost of
each option will be laid out before anything is engineered.

## After `/diag`

Paste the whole JSON back. The one field that can independently kill this
hosting plan is:

```
"HTTPS 443 -> console.neon.tech": { "ok": false, ... }
```

If that is `false`, the host blocks outbound HTTPS and the Neon database cannot
be reached from the app at all — regardless of how the port binding turned out.

`ok: true` means the connection **completed**; any HTTP status counts,
including 403 or 404. The test is whether traffic gets out, not what the far
end says.
