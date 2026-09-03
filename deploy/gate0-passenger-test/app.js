/**
 * GATE 0 — throwaway Passenger diagnostic. Delete after use.
 *
 * Primary question: does this host run a SELF-LISTENING Node app that binds
 * process.env.PORT (the model Next.js's standalone server uses), or does it
 * expect the older `module.exports = app` Express-adapter model?
 *
 * If you can load this app's URL at all, the self-listening model works and
 * Gate 0 passes. If it never responds, try app-modelb.js instead — see the
 * README in this folder.
 *
 * Secondary questions answered at /diag, so one deploy resolves several
 * unknowns rather than one:
 *   - Node version actually running
 *   - PORT and HOSTNAME Passenger injects
 *   - Memory ceiling visible to the process (CloudLinux LVE)
 *   - Outbound HTTPS/443 — THE ENTIRE DATABASE PLAN DEPENDS ON THIS
 *   - Outbound 587/465 SMTP — needed for the newsletter
 *   - Outbound 5432 — informational; confirms whether avoiding it was necessary
 *
 * Zero dependencies: Node standard library only, so it needs no npm install.
 */
const http = require("http");
const https = require("https");
const net = require("net");
const os = require("os");
const fs = require("fs");

const PORT = process.env.PORT || 3000;

/** Can we open a TCP connection to host:port within `timeoutMs`? */
function checkTcp(host, port, timeoutMs = 6000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const done = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done({ ok: true, detail: "connected" }));
    socket.once("timeout", () => done({ ok: false, detail: "timed out (likely firewalled)" }));
    socket.once("error", (err) => done({ ok: false, detail: err.code || err.message }));
    socket.connect(port, host);
  });
}

/** Can we complete an HTTPS request? Proves outbound 443 AND TLS egress. */
function checkHttps(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: timeoutMs }, (res) => {
      res.resume();
      resolve({ ok: true, detail: `HTTP ${res.statusCode}` });
    });
    req.once("timeout", () => {
      req.destroy();
      resolve({ ok: false, detail: "timed out (likely firewalled)" });
    });
    req.once("error", (err) => resolve({ ok: false, detail: err.code || err.message }));
  });
}

/** CloudLinux LVE / cgroup memory ceiling, if the process can see one. */
function memoryCeiling() {
  const candidates = [
    "/sys/fs/cgroup/memory.max",
    "/sys/fs/cgroup/memory/memory.limit_in_bytes",
  ];
  for (const p of candidates) {
    try {
      const raw = fs.readFileSync(p, "utf8").trim();
      if (raw && raw !== "max") {
        const bytes = Number(raw);
        if (Number.isFinite(bytes) && bytes > 0 && bytes < os.totalmem() * 4) {
          return `${(bytes / 1024 / 1024).toFixed(0)} MB (from ${p})`;
        }
      }
      if (raw === "max") return `no cgroup limit set (${p} = max)`;
    } catch {
      // not readable here; try the next candidate
    }
  }
  return "not detectable from inside the process — ask Yegara support";
}

async function diagnostics() {
  // Neon's own hostname is the meaningful 443 target: if this fails, the
  // HTTP-driver database plan does not work on this host.
  const [neon, generic, smtp587, smtp465, pg5432] = await Promise.all([
    checkHttps("https://console.neon.tech/"),
    checkHttps("https://api.github.com/"),
    checkTcp("127.0.0.1", 587, 3000),
    checkTcp("127.0.0.1", 465, 3000),
    checkTcp("ep-example.eu-west-2.aws.neon.tech", 5432, 5000),
  ]);

  return {
    gate0: "PASS — you are reading this, so the self-listening PORT model works",
    node: process.version,
    platform: `${process.platform} ${process.arch}`,
    env: {
      PORT: process.env.PORT ?? "(not set — using fallback 3000)",
      HOSTNAME: process.env.HOSTNAME ?? "(not set)",
      NODE_ENV: process.env.NODE_ENV ?? "(not set)",
    },
    memory: {
      ceiling: memoryCeiling(),
      osTotal: `${(os.totalmem() / 1024 / 1024).toFixed(0)} MB (may be the whole host, not your limit)`,
      rssNow: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(1)} MB`,
    },
    egress: {
      "HTTPS 443 -> console.neon.tech": neon,
      "HTTPS 443 -> api.github.com": generic,
      "TCP 587 -> localhost (mail submission)": smtp587,
      "TCP 465 -> localhost (mail SMTPS)": smtp465,
      "TCP 5432 -> neon (informational)": pg5432,
    },
    howToRead: {
      egress:
        "ok:true means the connection COMPLETED. Any HTTP status counts — even 403 " +
        "or 404 — because the thing being tested is whether the host lets the " +
        "connection out at all, not what the far end replies.",
      critical:
        "If 'HTTPS 443 -> console.neon.tech' is ok:false, STOP. The database plan " +
        "depends on outbound HTTPS and this host cannot do it.",
      mail:
        "The localhost 587/465 checks only show whether a local mail server is " +
        "listening. ECONNREFUSED here is not fatal — the real outbound SMTP test " +
        "happens in Phase 4 against the actual mail host.",
      port5432:
        "Expected to fail or time out. That is the whole reason the app uses Neon's " +
        "HTTP driver instead of a normal Postgres connection.",
    },
  };
}

http
  .createServer(async (req, res) => {
    if (req.url && req.url.startsWith("/diag")) {
      let payload;
      try {
        payload = await diagnostics();
      } catch (err) {
        payload = { error: String(err && err.stack ? err.stack : err) };
      }
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(payload, null, 2));
      return;
    }
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("ok\n\nGate 0 passed. Now open /diag on this same URL.\n");
  })
  .listen(PORT, () => {
    console.log(`gate0 test listening on ${PORT}`);
  });
