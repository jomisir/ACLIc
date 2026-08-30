import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  var __aclicDbClient: ReturnType<typeof postgres> | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const client =
  global.__aclicDbClient ??
  postgres(connectionString, { max: process.env.NODE_ENV === "production" ? 10 : 1 });

if (process.env.NODE_ENV !== "production") {
  global.__aclicDbClient = client;
}

export const db = drizzle(client, { schema });
