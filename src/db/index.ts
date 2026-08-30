import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Runtime driver only — this file runs on the shared host (Yegara/cPanel),
// which may firewall outbound non-web ports. The HTTP driver speaks
// Postgres-over-HTTPS to Neon's proxy, so it works from anywhere the app
// itself is reachable, with no raw TCP/5432 connection needed. There is no
// connection pool to manage here (unlike the old postgres-js setup): each
// query is a stateless HTTPS fetch, so nothing needs to be reused across
// requests or hot reloads.
//
// This driver does not support interactive transactions (multiple
// round-trips within one BEGIN/COMMIT). Nothing in this app needs that —
// verified by grepping for `.transaction(` calls, of which there are none —
// so no application logic changes were needed for this swap. If that ever
// changes, see `sql.transaction([...])` (non-interactive, batched) on the
// underlying client, or switch to the neon-serverless (WebSocket) driver.
//
// Migrations and the seed script are unaffected: they run from a developer
// machine or CI, never on the shared host, and keep using the regular
// `postgres` (postgres-js) package over a direct TCP connection — see
// src/db/seed.ts and drizzle.config.ts.

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const sql = neon(connectionString);

export const db = drizzle(sql, { schema });
