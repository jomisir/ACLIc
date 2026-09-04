// Next.js reads .env.local in preference to .env; plain dotenv reads only .env.
// Load both, .env.local winning, so drizzle-kit is pointed at the same database
// as the dev server and the db:* scripts. Without this, `npm run db:migrate`
// reports "url: undefined" whenever the connection string lives in .env.local —
// which is exactly where `neon link` writes it.
import dotenv from "dotenv";
dotenv.config({ path: [".env.local", ".env"] });
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
