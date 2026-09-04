/**
 * Local Neon-over-HTTP proxy — DEVELOPMENT ONLY.
 *
 * The app talks to Postgres through `@neondatabase/serverless`, which does not
 * open a socket to port 5432: it POSTs SQL over HTTPS to Neon's endpoint. That
 * means a DATABASE_URL pointing at your own `localhost:5432` cannot work — the
 * driver tries HTTPS against localhost and fails with ECONNREFUSED on :443.
 *
 * This proxy speaks the same request/response shape the Neon client expects and
 * forwards the SQL to a plain local Postgres, so you can develop and demo with
 * no Neon account and no internet. Point the app at it with:
 *
 *   NEON_FETCH_ENDPOINT=http://127.0.0.1:5599/sql
 *
 * Run it with `npm run dev:db-proxy` in one terminal and `npm run dev` in
 * another. NEVER set NEON_FETCH_ENDPOINT in production — unset means the real
 * Neon endpoint over HTTPS, which is what you want there.
 */
import dotenv from "dotenv";
import http from "node:http";

dotenv.config({ path: [".env.local", ".env"] });
import postgres from "postgres";

const PORT = Number(process.env.NEON_PROXY_PORT || 5599);

// Same DATABASE_URL the app uses, so there is only one place to set the
// database name. The app reads it as a Neon endpoint; the proxy reads it as an
// ordinary Postgres connection string and forwards to it.
const TARGET = process.env.DATABASE_URL;
if (!TARGET) {
  console.error(
    "DATABASE_URL is not set. Run this with the same environment as the app,\n" +
      "e.g.  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/aclic npm run dev:db-proxy",
  );
  process.exit(1);
}

// Neon returns every value as a string and lets the client parse it, so the
// shim must not let postgres-js do its own type coercion.
const sql = postgres(TARGET, { max: 4, types: {}, transform: { undefined: null } });

async function runOne({ query, params }, arrayMode) {
  // Neon puts every parameter on the wire as a STRING ("true", "42", ...) and
  // real Postgres infers each one's type from where it appears in the query.
  // postgres-js instead binds by JS type, so a string "true" compared against
  // a bool column silently matches nothing — which would quietly turn every
  // boolean filter in the app into "returns rows it should have excluded".
  //
  // Describe the statement first to get the parameter type OIDs Postgres
  // actually inferred, then rebuild the JS values to match. Costs an extra
  // round trip; this is a development shim, so that is fine.
  const raw = params ?? [];
  let bound = raw;
  if (raw.length) {
    const { types } = await sql.unsafe(query).describe();
    bound = raw.map((v, i) => {
      if (v === null || v === undefined) return null;
      if (types[i] === 16) return v === "true" || v === "t" || v === true; // bool
      return v;
    });
  }

  const res = await sql.unsafe(query, bound).values();
  const columns = res.columns ?? [];
  const rows = res.map((row) =>
    row.map((v) =>
      v === null || v === undefined
        ? null
        : v instanceof Date
          ? v.toISOString()
          : Buffer.isBuffer(v)
            ? "\\x" + v.toString("hex")
            : typeof v === "object"
              ? JSON.stringify(v)
              : String(v),
    ),
  );

  return {
    command: (query.trim().split(/\s+/)[0] || "").toUpperCase(),
    fields: columns.map((c) => ({
      name: c.name,
      dataTypeID: c.type,
      tableID: c.table ?? 0,
      columnID: c.number ?? 0,
      dataTypeSize: -1,
      dataTypeModifier: -1,
      format: "text",
    })),
    rowAsArray: arrayMode,
    rowCount: rows.length,
    rows: arrayMode
      ? rows
      : rows.map((r) => Object.fromEntries(r.map((v, i) => [columns[i]?.name ?? String(i), v]))),
  };
}

http
  .createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      const arrayMode = req.headers["neon-array-mode"] === "true";
      try {
        const parsed = JSON.parse(body);
        const payload = Array.isArray(parsed.queries)
          ? await Promise.all(parsed.queries.map((q) => runOne(q, arrayMode)))
          : await runOne(parsed, arrayMode);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(payload));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: String(err?.message ?? err), code: err?.code ?? null }));
      }
    });
  })
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `Port ${PORT} is already in use — most likely another copy of this proxy is\n` +
          `still running, possibly pointed at a different database, which would make\n` +
          `the site read from the wrong place. Stop that one first, or set\n` +
          `NEON_PROXY_PORT and match the port in NEON_FETCH_ENDPOINT.`,
      );
      process.exit(1);
    }
    throw err;
  })
  .listen(PORT, () => console.log(`Neon-over-HTTP proxy listening on ${PORT}, forwarding to ${new URL(TARGET).pathname.slice(1)} on ${new URL(TARGET).hostname}`));
